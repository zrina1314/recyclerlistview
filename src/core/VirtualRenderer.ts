import RecycleItemPool from "../utils/RecycleItemPool";
import { Dimension, BaseLayoutProvider } from "./dependencies/LayoutProvider";
import CustomError from "./exceptions/CustomError";
import RecyclerListViewExceptions from "./exceptions/RecyclerListViewExceptions";
import { Point, LayoutManager } from "./layoutmanager/LayoutManager";
import ViewabilityTracker, { TOnItemStatusChanged, WindowCorrection } from "./ViewabilityTracker";
import { ObjectUtil, Default } from "ts-object-utils";
import TSCast from "../utils/TSCast";
import { BaseDataProvider } from "./dependencies/DataProvider";

/**
 * Renderer which keeps track of recyclable items and the currently rendered items.
 * Notifies list view to re render if something changes, like scroll offset
 * 渲染器，用于跟踪可回收项和当前渲染的项。
 * 如果发生某些变化（如滚动偏移），则通知列表视图重新渲染。
 */
export interface RenderStackItem {
    /** 数据索引 */
    dataIndex?: number;
}

/**
 * 稳定 ID 映射项接口
 */
export interface StableIdMapItem {
    /** 键 */
    key: string;
    /** 类型 */
    type: string | number;
}

/**
 * 渲染堆栈接口，以键值对形式存储渲染项
 */
export interface RenderStack { 
    /** 渲染项，键为字符串，值为 RenderStackItem 类型 */
    [key: string]: RenderStackItem; 
}

/**
 * 渲染堆栈参数接口
 */
export interface RenderStackParams {
    /** 是否为水平滚动 */
    isHorizontal?: boolean;
    /** 项目数量 */
    itemCount: number;
    /** 初始偏移量 */
    initialOffset?: number;
    /** 初始渲染索引 */
    initialRenderIndex?: number;
    /** 预渲染偏移量 */
    renderAheadOffset?: number;
}

/**
 * 稳定 ID 提供者类型，接受一个索引参数并返回一个字符串
 */
export type StableIdProvider = (index: number) => string;

/**
 * 虚拟渲染器类，用于管理可回收项和当前渲染项
 */
export default class VirtualRenderer {
    /** 可见项变化时的回调函数 */
    private onVisibleItemsChanged: TOnItemStatusChanged | null;

    /** 下次更新时滚动到指定点的回调函数 */
    private _scrollOnNextUpdate: (point: Point) => void;
    /** 稳定 ID 到渲染键的映射 */
    private _stableIdToRenderKeyMap: { [key: string]: StableIdMapItem | undefined };
    /** 已参与的索引 */
    private _engagedIndexes: { [key: number]: number | undefined };
    /** 渲染堆栈 */
    private _renderStack: RenderStack;
    /** 渲染堆栈变化时的回调函数 */
    private _renderStackChanged: (renderStack: RenderStack) => void;
    /** 获取稳定 ID 的函数 */
    private _fetchStableId: StableIdProvider;
    /** 是否启用回收机制 */
    private _isRecyclingEnabled: boolean;
    /** 视图跟踪器是否正在运行 */
    private _isViewTrackerRunning: boolean;
    /** 是否标记为脏数据 */
    private _markDirty: boolean;
    /** 起始键 */
    private _startKey: number;
    /** 布局提供者 */
    private _layoutProvider: BaseLayoutProvider = TSCast.cast<BaseLayoutProvider>(null); //TSI
    /** 回收项池 */
    private _recyclePool: RecycleItemPool = TSCast.cast<RecycleItemPool>(null); //TSI

    /** 渲染堆栈参数 */
    private _params: RenderStackParams | null;
    /** 布局管理器 */
    private _layoutManager: LayoutManager | null = null;

    /** 视图跟踪器 */
    private _viewabilityTracker: ViewabilityTracker | null = null;
    /** 尺寸 */
    private _dimensions: Dimension | null;
    /** 是否为动画进行优化 */
    private _optimizeForAnimations: boolean = false;

    /**
     * 构造函数，初始化虚拟渲染器
     * @param renderStackChanged 渲染堆栈变化时的回调函数
     * @param scrollOnNextUpdate 下次更新时滚动到指定点的回调函数
     * @param fetchStableId 获取稳定 ID 的函数
     * @param isRecyclingEnabled 是否启用回收机制
     */
    constructor(renderStackChanged: (renderStack: RenderStack) => void,
                scrollOnNextUpdate: (point: Point) => void,
                fetchStableId: StableIdProvider,
                isRecyclingEnabled: boolean) {
        // Keeps track of items that need to be rendered in the next render cycle
        // 跟踪下一个渲染周期需要渲染的项
        this._renderStack = {};

        this._fetchStableId = fetchStableId;

        // Keeps track of keys of all the currently rendered indexes, 
        // can eventually replace renderStack as well if no new use cases come up
        // 跟踪所有当前渲染索引的键，如果没有新的用例出现，最终也可以取代 renderStack
        this._stableIdToRenderKeyMap = {};
        this._engagedIndexes = {};
        this._renderStackChanged = renderStackChanged;
        this._scrollOnNextUpdate = scrollOnNextUpdate;
        this._dimensions = null;
        this._params = null;
        this._isRecyclingEnabled = isRecyclingEnabled;

        this._isViewTrackerRunning = false;
        this._markDirty = false;

        // Would be surprised if someone exceeds this
        // 如果有人超过这个值，会很惊讶
        this._startKey = 0;

        this.onVisibleItemsChanged = null;
    }

    /**
     * 获取布局尺寸
     * @returns 布局尺寸
     */
    public getLayoutDimension(): Dimension {
        if (this._layoutManager) {
            return this._layoutManager.getContentDimension();
        }
        return { height: 0, width: 0 };
    }

    /**
     * 设置是否为动画进行优化
     * @param shouldOptimize 是否应该优化
     */
    public setOptimizeForAnimations(shouldOptimize: boolean): void {
        this._optimizeForAnimations = shouldOptimize;
    }

    /**
     * 检查是否有未完成的动画优化
     * @returns 是否有未完成的动画优化
     */
    public hasPendingAnimationOptimization(): boolean {
        return this._optimizeForAnimations;
    }

    /**
     * 更新偏移量
     * @param offsetX 水平偏移量
     * @param offsetY 垂直偏移量
     * @param isActual 是否为实际偏移量
     * @param correction 窗口校正
     */
    public updateOffset(offsetX: number, offsetY: number, isActual: boolean, correction: WindowCorrection): void {
        if (this._viewabilityTracker) {
            const offset = this._params && this._params.isHorizontal ? offsetX : offsetY;
            if (!this._isViewTrackerRunning) {
                if (isActual) {
                    this._viewabilityTracker.setActualOffset(offset);
                }
                this.startViewabilityTracker(correction);
            }
            this._viewabilityTracker.updateOffset(offset, isActual, correction);
        }
    }

    /**
     * 附加可见项监听器
     * @param callback 可见项状态变化时的回调函数
     */
    public attachVisibleItemsListener(callback: TOnItemStatusChanged): void {
        this.onVisibleItemsChanged = callback;
    }

    /**
     * 移除可见项监听器
     */
    public removeVisibleItemsListener(): void {
        this.onVisibleItemsChanged = null;

        if (this._viewabilityTracker) {
            this._viewabilityTracker.onVisibleRowsChanged = null;
        }
    }

    /**
     * 获取布局管理器
     * @returns 布局管理器或 null
     */
    public getLayoutManager(): LayoutManager | null {
        return this._layoutManager;
    }

    /**
     * 设置渲染堆栈参数和尺寸
     * @param params 渲染堆栈参数
     * @param dim 尺寸
     */
    public setParamsAndDimensions(params: RenderStackParams, dim: Dimension): void {
        this._params = params;
        this._dimensions = dim;
    }

    /**
     * 设置布局管理器
     * @param layoutManager 布局管理器
     */
    public setLayoutManager(layoutManager: LayoutManager): void {
        this._layoutManager = layoutManager;
        if (this._params) {
            this._layoutManager.relayoutFromIndex(0, this._params.itemCount);
        }
    }

    /**
     * 设置布局提供者
     * @param layoutProvider 布局提供者
     */
    public setLayoutProvider(layoutProvider: BaseLayoutProvider): void {
        this._layoutProvider = layoutProvider;
    }

    /**
     * 获取视图跟踪器
     * @returns 视图跟踪器或 null
     */
    public getViewabilityTracker(): ViewabilityTracker | null {
        return this._viewabilityTracker;
    }

    /**
     * 以锚点刷新视图
     */
    public refreshWithAnchor(): void {
        if (this._viewabilityTracker) {
            let firstVisibleIndex = this._viewabilityTracker.findFirstLogicallyVisibleIndex();
            this._prepareViewabilityTracker();
            let offset = 0;
            if (this._layoutManager && this._params) {
                firstVisibleIndex = Math.min(this._params.itemCount - 1, firstVisibleIndex);
                const point = this._layoutManager.getOffsetForIndex(firstVisibleIndex);
                this._scrollOnNextUpdate(point);
                offset = this._params.isHorizontal ? point.x : point.y;
            }
            this._viewabilityTracker.forceRefreshWithOffset(offset);
        }
    }

    /**
     * 刷新视图
     */
    public refresh(): void {
        if (this._viewabilityTracker) {
            this._prepareViewabilityTracker();
            this._viewabilityTracker.forceRefresh();
        }
    }

    /**
     * 获取初始偏移量
     * @returns 初始偏移量
     */
    public getInitialOffset(): Point {
        let offset = { x: 0, y: 0 };
        if (this._params) {
            const initialRenderIndex = Default.value<number>(this._params.initialRenderIndex, 0);
            if (initialRenderIndex > 0 && this._layoutManager) {
                offset = this._layoutManager.getOffsetForIndex(initialRenderIndex);
                this._params.initialOffset = this._params.isHorizontal ? offset.x : offset.y;
            } else {
                if (this._params.isHorizontal) {
                    offset.x = Default.value<number>(this._params.initialOffset, 0);
                    offset.y = 0;
                } else {
                    offset.y = Default.value<number>(this._params.initialOffset, 0);
                    offset.x = 0;
                }
            }
        }
        return offset;
    }

    /**
     * 初始化虚拟渲染器
     */
    public init(): void {
        this.getInitialOffset();
        this._recyclePool = new RecycleItemPool();
        if (this._params) {
            this._viewabilityTracker = new ViewabilityTracker(
                Default.value<number>(this._params.renderAheadOffset, 0),
                Default.value<number>(this._params.initialOffset, 0));
        } else {
            this._viewabilityTracker = new ViewabilityTracker(0, 0);
        }
        this._prepareViewabilityTracker();
    }

    /**
     * 启动视图跟踪器
     * @param windowCorrection 窗口校正
     */
    public startViewabilityTracker(windowCorrection: WindowCorrection): void {
        if (this._viewabilityTracker) {
            this._isViewTrackerRunning = true;
            this._viewabilityTracker.init(windowCorrection);
        }
    }

    /**
     * 同步并获取键
     * @param index 索引
     * @param overrideStableIdProvider 可选的稳定 ID 提供者
     * @param newRenderStack 可选的新渲染堆栈
     * @param keyToStableIdMap 可选的键到稳定 ID 的映射
     * @returns 同步后的键
     */
    public syncAndGetKey(index: number, overrideStableIdProvider?: StableIdProvider,
                         newRenderStack?: RenderStack,
                         keyToStableIdMap?: { [key: string]: string } ): string {
        const getStableId = overrideStableIdProvider ? overrideStableIdProvider : this._fetchStableId;
        const renderStack = newRenderStack ? newRenderStack : this._renderStack;
        const stableIdItem = this._stableIdToRenderKeyMap[getStableId(index)];
        let key = stableIdItem ? stableIdItem.key : undefined;

        if (ObjectUtil.isNullOrUndefined(key)) {
            const type = this._layoutProvider.getLayoutTypeForIndex(index);
            key = this._recyclePool.getRecycledObject(type);
            if (!ObjectUtil.isNullOrUndefined(key)) {
                const itemMeta = renderStack[key];
                if (itemMeta) {
                    const oldIndex = itemMeta.dataIndex;
                    itemMeta.dataIndex = index;
                    if (!ObjectUtil.isNullOrUndefined(oldIndex) && oldIndex !== index) {
                        delete this._stableIdToRenderKeyMap[getStableId(oldIndex)];
                    }
                } else {
                    renderStack[key] = { dataIndex: index };
                    if (keyToStableIdMap && keyToStableIdMap[key]) {
                        delete this._stableIdToRenderKeyMap[keyToStableIdMap[key]];
                    }
                }
            } else {
                key = getStableId(index);
                if (renderStack[key]) {
                    // Probable collision, warn and avoid
                    // 可能发生冲突，发出警告并避免
                    // TODO: Disabled incorrectly triggering in some cases
                    // console.warn("Possible stableId collision @", index); // tslint:disable-line
                    key = this._getCollisionAvoidingKey();
                }
                renderStack[key] = { dataIndex: index };
            }
            this._markDirty = true;
            this._stableIdToRenderKeyMap[getStableId(index)] = { key, type };
        }
        if (!ObjectUtil.isNullOrUndefined(this._engagedIndexes[index])) {
            this._recyclePool.removeFromPool(key);
        }
        const stackItem = renderStack[key];
        if (stackItem && stackItem.dataIndex !== index) {
            // Probable collision, warn
            // 可能发生冲突，发出警告
            console.warn("Possible stableId collision @", index); // tslint:disable-line
        }
        return key;
    }

    // Further optimize in later revision, pretty fast for now considering this is a low frequency event
    // 在后续版本中进一步优化，考虑到这是一个低频事件，目前速度相当快
    /**
     * 处理数据集更改
     * @param newDataProvider 新的数据提供者
     */
    public handleDataSetChange(newDataProvider: BaseDataProvider): void {
        const getStableId = newDataProvider.getStableId;
        const maxIndex = newDataProvider.getSize() - 1;
        const activeStableIds: { [key: string]: number } = {};
        const newRenderStack: RenderStack = {};
        const keyToStableIdMap: { [key: string]: string } = {};

        // Do not use recycle pool so that elements don't fly top to bottom or vice versa
        // Doing this is expensive and can draw extra items
        // 不使用回收池，以免元素从上到下或从下到上跳动
        // 这样做成本较高，可能会绘制额外的项目
        if (this._optimizeForAnimations && this._recyclePool) {
            this._recyclePool.clearAll();
        }

        // Compute active stable ids and stale active keys and resync render stack
        // 计算活跃的稳定 ID 和陈旧的活跃键，并重新同步渲染堆栈
        for (const key in this._renderStack) {
            if (this._renderStack.hasOwnProperty(key)) {
                const index = this._renderStack[key].dataIndex;
                if (!ObjectUtil.isNullOrUndefined(index)) {
                    if (index <= maxIndex) {
                        const stableId = getStableId(index);
                        activeStableIds[stableId] = 1;
                    }
                }
            }
        }

        // Clean stable id to key map
        // 清理稳定 ID 到键的映射
        const oldActiveStableIds = Object.keys(this._stableIdToRenderKeyMap);
        const oldActiveStableIdsCount = oldActiveStableIds.length;
        for (let i = 0; i < oldActiveStableIdsCount; i++) {
            const key = oldActiveStableIds[i];
            const stableIdItem = this._stableIdToRenderKeyMap[key];
            if (stableIdItem) {
                if (!activeStableIds[key]) {
                    if (!this._optimizeForAnimations && this._isRecyclingEnabled) {
                        this._recyclePool.putRecycledObject(stableIdItem.type, stableIdItem.key);
                    }
                    delete this._stableIdToRenderKeyMap[key];

                    const stackItem = this._renderStack[stableIdItem.key];
                    const dataIndex = stackItem ? stackItem.dataIndex : undefined;
                    if (!ObjectUtil.isNullOrUndefined(dataIndex) && dataIndex <= maxIndex && this._layoutManager) {
                        this._layoutManager.removeLayout(dataIndex);
                    }
                } else {
                    keyToStableIdMap[stableIdItem.key] = key;
                }
            }
        }
        const renderStackKeys = Object.keys(this._renderStack).sort((a, b) => {
            const firstItem = this._renderStack[a];
            const secondItem = this._renderStack[b];
            if (firstItem && firstItem.dataIndex && secondItem && secondItem.dataIndex) {
                return firstItem.dataIndex - secondItem.dataIndex;
            }
            return 1;
        });
        const renderStackLength = renderStackKeys.length;
        for (let i = 0; i < renderStackLength; i++) {
            const key = renderStackKeys[i];
            const index = this._renderStack[key].dataIndex;
            if (!ObjectUtil.isNullOrUndefined(index)) {
                if (index <= maxIndex) {
                    const newKey = this.syncAndGetKey(index, getStableId, newRenderStack, keyToStableIdMap);
                    const newStackItem = newRenderStack[newKey];
                    if (!newStackItem) {
                        newRenderStack[newKey] = { dataIndex: index };
                    } else if (newStackItem.dataIndex !== index) {
                        const cllKey = this._getCollisionAvoidingKey();
                        newRenderStack[cllKey] = { dataIndex: index };
                        this._stableIdToRenderKeyMap[getStableId(index)] = {
                            key: cllKey, type: this._layoutProvider.getLayoutTypeForIndex(index),
                        };
                    }
                }
            }
            delete this._renderStack[key];
        }

        Object.assign(this._renderStack, newRenderStack);

        for (const key in this._renderStack) {
            if (this._renderStack.hasOwnProperty(key)) {
                const index = this._renderStack[key].dataIndex;
                if (!ObjectUtil.isNullOrUndefined(index) && ObjectUtil.isNullOrUndefined(this._engagedIndexes[index])) {
                    const type = this._layoutProvider.getLayoutTypeForIndex(index);
                    this._recyclePool.putRecycledObject(type, key);
                }
            }
        }
    }

    /**
     * 获取避免冲突的键
     * @returns 避免冲突的键
     */
    private _getCollisionAvoidingKey(): string {
        return "#" + this._startKey++ + "_rlv_c";
    }

    /**
     * 准备视图跟踪器
     */
    private _prepareViewabilityTracker(): void {
        if (this._viewabilityTracker && this._layoutManager && this._dimensions && this._params) {
            this._viewabilityTracker.onEngagedRowsChanged = this._onEngagedItemsChanged;
            if (this.onVisibleItemsChanged) {
                this._viewabilityTracker.onVisibleRowsChanged = this._onVisibleItemsChanged;
            }
            this._viewabilityTracker.setLayouts(this._layoutManager.getLayouts(), this._params.isHorizontal ?
                this._layoutManager.getContentDimension().width :
                this._layoutManager.getContentDimension().height);
            this._viewabilityTracker.setDimensions({
                height: this._dimensions.height,
                width: this._dimensions.width,
            }, Default.value<boolean>(this._params.isHorizontal, false));
        } else {
            throw new CustomError(RecyclerListViewExceptions.initializationException);
        }
    }

    /**
     * 可见项变化时的回调函数
     * @param all 所有可见项的索引
     * @param now 现在可见项的索引
     * @param notNow 现在不可见项的索引
     */
    private _onVisibleItemsChanged = (all: number[], now: number[], notNow: number[]): void => {
        if (this.onVisibleItemsChanged) {
            this.onVisibleItemsChanged(all, now, notNow);
        }
    }

    /**
     * 参与项变化时的回调函数
     * @param all 所有参与项的索引
     * @param now 现在参与项的索引
     * @param notNow 现在不参与项的索引
     */
    private _onEngagedItemsChanged = (all: number[], now: number[], notNow: number[]): void => {
        const count = notNow.length;
        let resolvedKey;
        let disengagedIndex = 0;
        if (this._isRecyclingEnabled) {
            for (let i = 0; i < count; i++) {
                disengagedIndex = notNow[i];
                delete this._engagedIndexes[disengagedIndex];
                if (this._params && disengagedIndex < this._params.itemCount) {
                    // All the items which are now not visible can go to the recycle pool, 
                    // the pool only needs to maintain keys since
                    // react can link a view to a key automatically
                    // 所有现在不可见的项都可以放入回收池，回收池只需要维护键，因为 React 可以自动将视图与键关联起来
                    resolvedKey = this._stableIdToRenderKeyMap[this._fetchStableId(disengagedIndex)];
                    if (!ObjectUtil.isNullOrUndefined(resolvedKey)) {
                        this._recyclePool.putRecycledObject(this._layoutProvider.getLayoutTypeForIndex(disengagedIndex), resolvedKey.key);
                    }
                }
            }
        }
        if (this._updateRenderStack(now)) {
            // Ask Recycler View to update itself
            // 要求 Recycler View 自我更新
            this._renderStackChanged(this._renderStack);
        }
    }

    /**
     * 更新渲染堆栈
     * @description 更新渲染堆栈并报告是否有任何更改
     * @description Updates render stack and reports whether anything has changed
     * @param itemIndexes 项目索引数组
     * @returns 是否有更改
     */
    private _updateRenderStack(itemIndexes: number[]): boolean {
        this._markDirty = false;
        const count = itemIndexes.length;
        let index = 0;
        let hasRenderStackChanged = false;
        for (let i = 0; i < count; i++) {
            index = itemIndexes[i];
            this._engagedIndexes[index] = 1;
            this.syncAndGetKey(index);
            hasRenderStackChanged = this._markDirty;
        }
        this._markDirty = false;
        return hasRenderStackChanged;
    }
}
