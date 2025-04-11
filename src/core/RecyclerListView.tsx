/***
 * DONE: Reduce layout processing on data insert
 * DONE: Add notify data set changed and notify data insert option in data source
 * DONE: Add on end reached callback
 * DONE: Make another class for render stack generator
 * DONE: Simplify rendering a loading footer
 * DONE: Anchor first visible index on any insert/delete data wise
 * DONE: Build Scroll to index
 * DONE: Give viewability callbacks
 * DONE: Add full render logic in cases like change of dimensions
 * DONE: Fix all proptypes
 * DONE: Add Initial render Index support
 * DONE: Add animated scroll to web scrollviewer
 * DONE: Animate list view transition, including add/remove
 * DONE: Implement sticky headers and footers
 * TODO: Destroy less frequently used items in recycle pool, this will help in case of too many types.
 * TODO: Make viewability callbacks configurable
 * TODO: Observe size changes on web to optimize for reflowability
 * TODO: Solve //TSI
 * 已完成: 减少数据插入时的布局处理
 * 已完成: 在数据源中添加通知数据集更改和通知数据插入选项
 * 已完成: 添加滚动到底部回调
 * 已完成: 为渲染堆栈生成器创建另一个类
 * 已完成: 简化加载页脚的渲染
 * 已完成: 在任何插入/删除数据时锚定第一个可见索引
 * 已完成: 构建滚动到指定索引的功能
 * 已完成: 提供可见性回调
 * 已完成: 在尺寸更改等情况下添加完整的渲染逻辑
 * 已完成: 修复所有属性类型
 * 已完成: 添加初始渲染索引支持
 * 已完成: 为网页滚动查看器添加动画滚动
 * 已完成: 为列表视图过渡添加动画效果，包括添加/移除
 * 已完成: 实现粘性头部和底部
 * 待办: 销毁回收池中不常用的项目，这将有助于处理过多类型的情况。
 * 待办: 使可见性回调可配置
 * 待办: 观察网页上的尺寸变化以优化回流性能
 * 待办: 解决 //TSI
 */
import debounce = require("lodash.debounce");
import * as PropTypes from "prop-types";
import * as React from "react";
import { ObjectUtil, Default } from "ts-object-utils";
import ContextProvider from "./dependencies/ContextProvider";
import { BaseDataProvider } from "./dependencies/DataProvider";
import { Dimension, BaseLayoutProvider } from "./dependencies/LayoutProvider";
import CustomError from "./exceptions/CustomError";
import RecyclerListViewExceptions from "./exceptions/RecyclerListViewExceptions";
import { Point, Layout, LayoutManager } from "./layoutmanager/LayoutManager";
import { Constants } from "./constants/Constants";
import { Messages } from "./constants/Messages";
import BaseScrollComponent from "./scrollcomponent/BaseScrollComponent";
import BaseScrollView, { ScrollEvent, ScrollViewDefaultProps } from "./scrollcomponent/BaseScrollView";
import { TOnItemStatusChanged, WindowCorrection } from "./ViewabilityTracker";
import VirtualRenderer, { RenderStack, RenderStackItem, RenderStackParams } from "./VirtualRenderer";
import ItemAnimator, { BaseItemAnimator } from "./ItemAnimator";
import { DebugHandlers } from "..";
import { ComponentCompat } from "../utils/ComponentCompat";
//#if [REACT-NATIVE]
import ScrollComponent from "../platform/reactnative/scrollcomponent/ScrollComponent";
import ViewRenderer from "../platform/reactnative/viewrenderer/ViewRenderer";
import { DefaultJSItemAnimator as DefaultItemAnimator } from "../platform/reactnative/itemanimators/defaultjsanimator/DefaultJSItemAnimator";
import { Platform, ScrollView } from "react-native";
const IS_WEB = !Platform || Platform.OS === "web";
//#endif

/***
 * To use on web, start importing from recyclerlistview/web. To make it even easier specify an alias in you builder of choice.
 * 要在网页上使用，请从 recyclerlistview/web 开始导入。为了更方便，可以在你选择的构建工具中指定别名。
 */

//#if [WEB]
//import ScrollComponent from "../platform/web/scrollcomponent/ScrollComponent";
//import ViewRenderer from "../platform/web/viewrenderer/ViewRenderer";
//import { DefaultWebItemAnimator as DefaultItemAnimator } from "../platform/web/itemanimators/DefaultWebItemAnimator";
//const IS_WEB = true;
//type ScrollView = unknown;
//#endif

/***
 * This is the main component, please refer to samples to understand how to use.
 * For advanced usage check out prop descriptions below.
 * You also get common methods such as: scrollToIndex, scrollToItem, scrollToTop, scrollToEnd, scrollToOffset, getCurrentScrollOffset,
 * findApproxFirstVisibleIndex.
 * You'll need a ref to Recycler in order to call these
 * Needs to have bounded size in all cases other than window scrolling (web).
 * 这是主要组件，请参考示例以了解如何使用。
 * 对于高级用法，请查看下面的属性描述。
 * 你还可以使用一些常用方法，如：scrollToIndex、scrollToItem、scrollToTop、scrollToEnd、scrollToOffset、getCurrentScrollOffset、
 * findApproxFirstVisibleIndex。
 * 你需要一个对 Recycler 的引用才能调用这些方法。
 * 在除网页窗口滚动之外的所有情况下，都需要有固定的大小。
 *
 * NOTE: React Native implementation uses ScrollView internally which means you get all ScrollView features as well such as Pull To Refresh, paging enabled
 *       You can easily create a recycling image flip view using one paging enabled flag. Read about ScrollView features in official
 *       react native documentation.
 * NOTE: If you see blank space look at the renderAheadOffset prop and make sure your data provider has a good enough rowHasChanged method.
 *       Blanks are totally avoidable with this listview.
 * NOTE: Also works on web (experimental)
 * NOTE: For reflowability set canChangeSize to true (experimental)
 * 注意: React Native 实现内部使用 ScrollView，这意味着你也可以使用所有 ScrollView 功能，如下拉刷新、分页启用
 *       你可以使用分页启用标志轻松创建一个循环图像翻转视图。请阅读官方 React Native 文档中的 ScrollView 功能。
 * 注意: 如果你看到空白区域，请查看 renderAheadOffset 属性，并确保你的数据源有一个足够好的 rowHasChanged 方法。
 *       使用这个列表视图可以完全避免空白。
 * 注意: 也可以在网页上使用（实验性）
 * 注意: 为了实现回流性能，请将 canChangeSize 设置为 true（实验性）
 */
export interface OnRecreateParams {
    // 最后一次滚动偏移量
    lastOffset?: number;
}

/**
 * RecyclerListView 的属性接口
 */
export interface RecyclerListViewProps {
    /** 布局提供者，用于定义列表项的布局 */ 
    layoutProvider: BaseLayoutProvider;
    /** 数据提供者，用于提供列表的数据 */ 
    dataProvider: BaseDataProvider;
    /** 行渲染器，用于渲染列表项 */ 
    rowRenderer: (type: string | number, data: any, index: number, extendedState?: object) => JSX.Element | JSX.Element[] | null;
    /** 上下文提供者，用于保存和恢复滚动位置等信息 */ 
    contextProvider?: ContextProvider;
    /** 预渲染偏移量，指定提前渲染的像素数 */ 
    renderAheadOffset?: number;
    /** 是否为水平滚动列表 */ 
    isHorizontal?: boolean;
    /** 滚动事件回调函数 */ 
    onScroll?: (rawEvent: ScrollEvent, offsetX: number, offsetY: number) => void;
    /** 重新创建列表时的回调函数 */ 
    onRecreate?: (params: OnRecreateParams) => void;
    /** 滚动到底部时的回调函数 */ 
    onEndReached?: () => void;
    /** 滚动到底部的阈值（像素） */ 
    onEndReachedThreshold?: number;
    /** 滚动到底部的相对阈值（相对于可见列表长度） */ 
    onEndReachedThresholdRelative?: number;
    /** 可见索引变化的回调函数 */ 
    onVisibleIndexesChanged?: TOnItemStatusChanged;
    /** 可见索引变化的回调函数 */ 
    onVisibleIndicesChanged?: TOnItemStatusChanged;
    /** 渲染页脚的函数 */ 
    renderFooter?: () => JSX.Element | JSX.Element[] | null;
    /** 外部滚动视图组件 */ 
    externalScrollView?: { new(props: ScrollViewDefaultProps): BaseScrollView };
    /** 列表的布局尺寸 */ 
    layoutSize?: Dimension;
    /** 初始滚动偏移量 */ 
    initialOffset?: number;
    /** 初始渲染索引 */ 
    initialRenderIndex?: number;
    /** 滚动节流时间（iOS 专用） */ 
    scrollThrottle?: number;
    /** 是否允许列表大小改变 */ 
    canChangeSize?: boolean;
    /** 是否使用窗口滚动（Web 专用） */ 
    useWindowScroll?: boolean;
    /** 是否禁用回收机制 */ 
    disableRecycling?: boolean;
    /** 是否强制非确定性渲染 */ 
    forceNonDeterministicRendering?: boolean;
    /** 扩展状态对象，用于传递额外的状态信息 */ 
    extendedState?: object;
    /** 项目动画器，用于实现列表项的动画效果 */ 
    itemAnimator?: ItemAnimator;
    /** 是否优化插入和删除动画 */ 
    optimizeForInsertDeleteAnimations?: boolean;
    /** 样式 */ 
    style?: object | number;
    /** 调试处理函数 */ 
    debugHandlers?: DebugHandlers;
    /** 渲染内容容器的函数 */ 
    renderContentContainer?: (props?: object, children?: React.ReactNode) => React.ReactNode | null;
    /** 渲染项目容器的函数 */ 
    renderItemContainer?: (props: object, parentProps: object, children?: React.ReactNode) => React.ReactNode;
    //For all props that need to be proxied to inner/external scrollview. Put them in an object and they'll be spread
    //and passed down. For better typescript support.
    /** 传递给内部/外部滚动视图的属性对象 */ 
    scrollViewProps?: object;
    /** 应用窗口校正的函数 */ 
    applyWindowCorrection?: (offsetX: number, offsetY: number, windowCorrection: WindowCorrection) => void;
    /** 项目布局回调函数 */ 
    onItemLayout?: (index: number) => void;
    /** 窗口校正配置对象 */ 
    windowCorrectionConfig?: { value?: WindowCorrection, applyToInitialOffset?: boolean, applyToItemScroll?: boolean };

    //This can lead to inconsistent behavior. Use with caution.
    //If set to true, recyclerlistview will not measure itself if scrollview mounts with zero height or width.
    //If there are no following events with right dimensions nothing will be rendered.
    /**
     * 这可能会导致不一致的行为，请谨慎使用。
     * 如果设置为 true，当滚动视图以零高度或宽度挂载时，RecyclerListView 将不会测量自身。
     * 如果没有后续具有正确尺寸的事件，将不会渲染任何内容。
     */
    suppressBoundedSizeException?: boolean;
}

/**
 * RecyclerListView 的状态接口
 */
export interface RecyclerListViewState {
    /** 渲染堆栈，包含要渲染的项目信息 */ 
    renderStack: RenderStack;
    /** 内部快照，用于保存状态信息 */ 
    internalSnapshot: Record<string, object>;
}

/**
 * 窗口校正配置接口
 */
export interface WindowCorrectionConfig {
    /** 窗口校正值 */ 
    value: WindowCorrection;
    /** 是否应用于初始偏移量 */ 
    applyToInitialOffset: boolean;
    /** 是否应用于项目滚动 */ 
    applyToItemScroll: boolean;
}

/**
 * RecyclerListView 组件类
 */
export default class RecyclerListView<P extends RecyclerListViewProps, S extends RecyclerListViewState> extends ComponentCompat<P, S> {
    // 默认属性
    public static defaultProps = {
        /** 是否允许列表大小改变 */ 
        canChangeSize: false,
        /** 是否禁用回收机制 */ 
        disableRecycling: false,
        /** 初始滚动偏移量 */ 
        initialOffset: 0,
        /** 初始渲染索引 */ 
        initialRenderIndex: 0,
        /** 是否为水平滚动列表 */ 
        isHorizontal: false,
        /** 滚动到底部的阈值（像素） */ 
        onEndReachedThreshold: 0,
        /** 滚动到底部的相对阈值（相对于可见列表长度） */ 
        onEndReachedThresholdRelative: 0,
        /** 预渲染偏移量 */ 
        renderAheadOffset: IS_WEB ? 1000 : 250,
    };

    // 属性类型定义
    public static propTypes = {};

    /** 刷新请求防抖函数 */ 
    private refreshRequestDebouncer = debounce((executable: () => void) => {
        executable();
    });

    /** 虚拟渲染器实例 */ 
    private _virtualRenderer: VirtualRenderer;
    /** 滚动到底部回调是否已调用 */ 
    private _onEndReachedCalled = false;
    /** 初始化是否完成 */ 
    private _initComplete = false;
    /** 组件是否已挂载 */ 
    private _isMounted = true;
    /** 重新布局请求索引 */ 
    private _relayoutReqIndex: number = -1;
    /** 渲染堆栈参数 */ 
    private _params: RenderStackParams = {
        /** 初始滚动偏移量 */ 
        initialOffset: 0,
        /** 初始渲染索引 */ 
        initialRenderIndex: 0,
        /** 是否为水平滚动列表 */ 
        isHorizontal: false,
        /** 项目数量 */ 
        itemCount: 0,
        /** 预渲染偏移量 */ 
        renderAheadOffset: 250,
    };
    /** 布局尺寸 */ 
    private _layout: Dimension = { height: 0, width: 0 };
    /** 待处理的滚动偏移量 */ 
    private _pendingScrollToOffset: Point | null = null;
    /** 待处理的渲染堆栈 */ 
    private _pendingRenderStack?: RenderStack;
    /** 临时布局尺寸 */ 
    private _tempDim: Dimension = { height: 0, width: 0 };
    /** 初始滚动偏移量 */ 
    private _initialOffset = 0;
    /** 缓存的布局信息 */ 
    private _cachedLayouts?: Layout[];
    /** 滚动组件实例 */ 
    private _scrollComponent: BaseScrollComponent | null = null;
    /** 窗口校正配置 */ 
    private _windowCorrectionConfig: WindowCorrectionConfig;

    //If the native content container is used, then positions of the list items are changed on the native side. The animated library used
    //by the default item animator also changes the same positions which could lead to inconsistency. Hence, the base item animator which
    //does not perform any such animations will be used.
    /**
     * 如果使用原生内容容器，则列表项的位置会在原生端更改。默认项目动画器使用的动画库也会更改相同的位置，这可能会导致不一致。
     * 因此，将使用不执行任何此类动画的基础项目动画器。
     * @private
     * @type {ItemAnimator}
     * @memberof RecyclerListView
     */
    private _defaultItemAnimator: ItemAnimator = new BaseItemAnimator();

    /**
     * 构造函数
     * @param props - 组件属性
     * @param context - 组件上下文
     */
    constructor(props: P, context?: any) {
        super(props, context);
        // 初始化虚拟渲染器
        this._virtualRenderer = new VirtualRenderer(this._renderStackWhenReady, (offset) => {
            this._pendingScrollToOffset = offset;
        }, (index) => {
            return this.props.dataProvider.getStableId(index);
        }, !props.disableRecycling);

        // 处理窗口校正配置
        if (this.props.windowCorrectionConfig) {
            let windowCorrection;
            if (this.props.windowCorrectionConfig.value) {
                windowCorrection = this.props.windowCorrectionConfig.value;
            } else {
                windowCorrection = {  startCorrection: 0, endCorrection: 0, windowShift: 0  };
            }
            this._windowCorrectionConfig = {
                applyToItemScroll: !!this.props.windowCorrectionConfig.applyToItemScroll,
                applyToInitialOffset: !!this.props.windowCorrectionConfig.applyToInitialOffset,
                value: windowCorrection,
             };
        } else {
            this._windowCorrectionConfig = {
                applyToItemScroll: false,
                applyToInitialOffset: false,
                value: { startCorrection: 0, endCorrection: 0, windowShift: 0 },
             };
        }
        // 从上下文提供者获取上下文信息
        this._getContextFromContextProvider(props);
        // 如果提供了布局尺寸，则进行初始化
        if (props.layoutSize) {
            this._layout.height = props.layoutSize.height;
            this._layout.width = props.layoutSize.width;
            this._initComplete = true;
            this._initTrackers(props);
        } else {
            this.state = {
                internalSnapshot: {},
                renderStack: {},
            } as S;
        }
    }

    /**
     * 组件接收到新属性时的回调函数
     * @param newProps - 新的组件属性
     */
    public componentWillReceivePropsCompat(newProps: RecyclerListViewProps): void {
        // 检查依赖项是否存在
        this._assertDependencyPresence(newProps);
        // 检查并更改布局
        this._checkAndChangeLayouts(newProps);
        // 如果没有提供 onVisibleIndicesChanged 属性，则移除可见项目监听器
        if (!newProps.onVisibleIndicesChanged) {
            this._virtualRenderer.removeVisibleItemsListener();
        }
        // 如果提供了 onVisibleIndexesChanged 属性，则抛出错误
        if (newProps.onVisibleIndexesChanged) {
            throw new CustomError(RecyclerListViewExceptions.usingOldVisibleIndexesChangedParam);
        }
        // 如果提供了 onVisibleIndicesChanged 属性，则附加可见项目监听器
        if (newProps.onVisibleIndicesChanged) {
            this._virtualRenderer.attachVisibleItemsListener(newProps.onVisibleIndicesChanged!);
        }
    }

    /**
     * 组件更新完成后的回调函数
     */
    public componentDidUpdate(): void {
        // 处理初始滚动偏移量
        this._processInitialOffset();
        // 处理滚动到底部的回调
        this._processOnEndReached();
        // 检查并更改布局
        this._checkAndChangeLayouts(this.props);
        // 设置是否优化动画
        this._virtualRenderer.setOptimizeForAnimations(false);
    }

    /**
     * 组件挂载完成后的回调函数
     */
    public componentDidMount(): void {
        // 如果初始化完成，则处理初始滚动偏移量和滚动到底部的回调
        if (this._initComplete) {
            this._processInitialOffset();
            this._processOnEndReached();
        }
    }

    /**
     * 组件即将卸载时的回调函数
     */
    public componentWillUnmount(): void {
        // 标记组件已卸载
        this._isMounted = false;
        // 如果提供了上下文提供者，则保存滚动偏移量和布局信息
        if (this.props.contextProvider) {
            const uniqueKey = this.props.contextProvider.getUniqueKey();
            if (uniqueKey) {
                this.props.contextProvider.save(uniqueKey + Constants.CONTEXT_PROVIDER_OFFSET_KEY_SUFFIX, this.getCurrentScrollOffset());
                if (this.props.forceNonDeterministicRendering) {
                    if (this._virtualRenderer) {
                        const layoutManager = this._virtualRenderer.getLayoutManager();
                        if (layoutManager) {
                            const layoutsToCache = layoutManager.getLayouts();
                            this.props.contextProvider.save(uniqueKey + Constants.CONTEXT_PROVIDER_LAYOUT_KEY_SUFFIX,
                                JSON.stringify({ layoutArray: layoutsToCache }));
                        }
                    }
                }
            }
        }
    }

    /**
     * 滚动到指定索引的项目
     * @param index - 要滚动到的项目索引
     * @param animate - 是否使用动画滚动
     */
    public scrollToIndex(index: number, animate?: boolean): void {
        const layoutManager = this._virtualRenderer.getLayoutManager();
        if (layoutManager) {
            const offsets = layoutManager.getOffsetForIndex(index);
            this.scrollToOffset(offsets.x, offsets.y, animate, this._windowCorrectionConfig.applyToItemScroll);
        } else {
            console.warn(Messages.WARN_SCROLL_TO_INDEX); //tslint:disable-line
        }
    }

    /**
     * This API is almost similar to scrollToIndex, but differs when the view is already in viewport.
     * Instead of bringing the view to the top of the viewport, it will calculate the overflow of the @param index
     * and scroll to just bring the entire view to viewport.
     * 这个 API 与 scrollToIndex 几乎相似，但当视图已经在视口中时有所不同。
     * 它不会将视图滚动到视口顶部，而是计算 @param index 视图的溢出部分，
     * 并滚动以确保整个视图完全显示在视口中。
     * @param index - 要滚动到的项目索引
     * @param animate - 是否使用动画滚动
     */
    public bringToFocus(index: number, animate?: boolean): void {
        const listSize = this.getRenderedSize();
        const itemLayout = this.getLayout(index);
        const currentScrollOffset = this.getCurrentScrollOffset() + this._windowCorrectionConfig.value.windowShift;
        const {isHorizontal} = this.props;
        if (itemLayout) {
            const mainAxisLayoutDimen = isHorizontal ? itemLayout.width : itemLayout.height;
            const mainAxisLayoutPos = isHorizontal ? itemLayout.x : itemLayout.y;
            const mainAxisListDimen = isHorizontal ? listSize.width : listSize.height;
            const screenEndPos = mainAxisListDimen + currentScrollOffset;
            if (mainAxisLayoutDimen > mainAxisListDimen || mainAxisLayoutPos < currentScrollOffset || mainAxisLayoutPos > screenEndPos) {
                this.scrollToIndex(index);
            } else {
                const viewEndPos = mainAxisLayoutPos + mainAxisLayoutDimen;
                if (viewEndPos > screenEndPos) {
                    const offset = viewEndPos - screenEndPos;
                    this.scrollToOffset(offset + currentScrollOffset, offset + currentScrollOffset, animate, true);
                }
            }
        }
    }

    /**
     * 滚动到包含指定数据的项目
     * @param data - 要滚动到的项目数据
     * @param animate - 是否使用动画滚动
     */
    public scrollToItem(data: any, animate?: boolean): void {
        const count = this.props.dataProvider.getSize();
        for (let i = 0; i < count; i++) {
            if (this.props.dataProvider.getDataForIndex(i) === data) {
                this.scrollToIndex(i, animate);
                break;
            }
        }
    }

    /**
     * 获取指定索引项目的布局信息
     * @param index - 项目索引
     * @returns 项目布局信息，如果不存在则返回 undefined
     */
    public getLayout(index: number): Layout | undefined {
        const layoutManager = this._virtualRenderer.getLayoutManager();
        return layoutManager ? layoutManager.getLayouts()[index] : undefined;
    }

    /**
     * 滚动到列表顶部
     * @param animate - 是否使用动画滚动
     */
    public scrollToTop(animate?: boolean): void {
        this.scrollToOffset(0, 0, animate);
    }

    /**
     * 滚动到列表底部
     * @param animate - 是否使用动画滚动
     */
    public scrollToEnd(animate?: boolean): void {
        const lastIndex = this.props.dataProvider.getSize() - 1;
        this.scrollToIndex(lastIndex, animate);
    }

    // useWindowCorrection specifies if correction should be applied to these offsets in case you implement
    // `applyWindowCorrection` method
    // useWindowCorrection 指定是否应将校正应用于这些偏移量，以防你实现了 `applyWindowCorrection` 方法
    /**
     * 滚动到指定偏移量
     * @param x - 水平偏移量
     * @param y - 垂直偏移量
     * @param animate - 是否使用动画滚动
     * @param useWindowCorrection - 是否应用窗口校正
     */
    public scrollToOffset = (x: number, y: number, animate: boolean = false, useWindowCorrection: boolean = false): void => {
        if (this._scrollComponent) {
            if (this.props.isHorizontal) {
                y = 0;
                x = useWindowCorrection ? x - this._windowCorrectionConfig.value.windowShift : x;
            } else {
                x = 0;
                y = useWindowCorrection ? y - this._windowCorrectionConfig.value.windowShift : y;
            }
            this._scrollComponent.scrollTo(x, y, animate);
        }
    }

    // You can use requestAnimationFrame callback to change renderAhead in multiple frames to enable advanced progressive
    // rendering when view types are very complex. This method returns a boolean saying if the update was committed. Retry in
    // the next frame if you get a failure (if mount wasn't complete). Value should be greater than or equal to 0;
    // Very useful when you have a page where you need a large renderAheadOffset. Setting it at once will slow down the load and
    // this will help mitigate that.
    // 你可以使用 requestAnimationFrame 回调在多个帧中更改 renderAhead，以在视图类型非常复杂时启用高级渐进式渲染。
    // 此方法返回一个布尔值，表示更新是否已提交。如果失败（如果挂载未完成），请在下一帧重试。值应大于或等于 0；
    // 当你有一个需要大 renderAheadOffset 的页面时非常有用。一次性设置它会减慢加载速度，而这将有助于缓解这个问题。
    /**
     * 更新预渲染偏移量
     * @param renderAheadOffset - 新的预渲染偏移量
     * @returns 更新是否成功
     */
    public updateRenderAheadOffset(renderAheadOffset: number): boolean {
        const viewabilityTracker = this._virtualRenderer.getViewabilityTracker();
        if (viewabilityTracker) {
            viewabilityTracker.updateRenderAheadOffset(renderAheadOffset);
            return true;
        }
        return false;
    }

    /**
     * 获取当前的预渲染偏移量
     * @returns 当前的预渲染偏移量
     */
    public getCurrentRenderAheadOffset(): number {
        const viewabilityTracker = this._virtualRenderer.getViewabilityTracker();
        if (viewabilityTracker) {
            return viewabilityTracker.getCurrentRenderAheadOffset();
        }
        return this.props.renderAheadOffset!;
    }

    /**
     * 获取当前的滚动偏移量
     * @returns 当前的滚动偏移量
     */
    public getCurrentScrollOffset(): number {
        const viewabilityTracker = this._virtualRenderer.getViewabilityTracker();
        return viewabilityTracker ? viewabilityTracker.getLastActualOffset() : 0;
    }

    /**
     * 查找近似的第一个可见项目索引
     * @returns 近似的第一个可见项目索引
     */
    public findApproxFirstVisibleIndex(): number {
        const viewabilityTracker = this._virtualRenderer.getViewabilityTracker();
        return viewabilityTracker ? viewabilityTracker.findFirstLogicallyVisibleIndex() : 0;
    }

    /**
     * 获取渲染的列表尺寸
     * @returns 渲染的列表尺寸
     */
    public getRenderedSize(): Dimension {
        return this._layout;
    }

    /**
     * 获取内容的尺寸
     * @returns 内容的尺寸
     */
    public getContentDimension(): Dimension {
        // ... 方法体未给出，这里可能需要根据实际情况补充 ...
        return this._virtualRenderer.getLayoutDimension();
    }

    // Force Rerender forcefully to update view renderer. Use this in rare circumstances
    // 强制重新渲染以更新视图渲染器。在极少数情况下使用此方法
    /**
     * 强制重新渲染组件
     */
    public forceRerender(): void {
        this.setState({
            internalSnapshot: {},
        });
    }

    /**
     * 获取可滚动节点
     * @returns 可滚动节点的 ID 或 null
     */
    public getScrollableNode(): number | null {
        if (this._scrollComponent && this._scrollComponent.getScrollableNode) {
          return this._scrollComponent.getScrollableNode();
        }
        return null;
    }

    /**
     * 获取原生滚动引用
     * @returns 原生滚动引用或 null
     */
    public getNativeScrollRef(): ScrollView | null {
        if (this._scrollComponent && this._scrollComponent.getNativeScrollRef) {
          return this._scrollComponent.getNativeScrollRef();
        }
        return null;
    }

    public renderCompat(): JSX.Element {
        //TODO:Talha
        // const {
        //     layoutProvider,
        //     dataProvider,
        //     contextProvider,
        //     renderAheadOffset,
        //     onEndReached,
        //     onEndReachedThreshold,
        //     onVisibleIndicesChanged,
        //     initialOffset,
        //     initialRenderIndex,
        //     disableRecycling,
        //     forceNonDeterministicRendering,
        //     extendedState,
        //     itemAnimator,
        //     rowRenderer,
        //     ...props,
        // } = this.props;

        return (
            <ScrollComponent
                ref={(scrollComponent) => this._scrollComponent = scrollComponent as BaseScrollComponent | null}
                {...this.props}
                {...this.props.scrollViewProps}
                onScroll={this._onScroll}
                onSizeChanged={this._onSizeChanged}
                contentHeight={this._initComplete ? this._virtualRenderer.getLayoutDimension().height : 0}
                contentWidth={this._initComplete ? this._virtualRenderer.getLayoutDimension().width : 0}
                renderAheadOffset={this.getCurrentRenderAheadOffset()}>
                {this._generateRenderStack()}
            </ScrollComponent>
        );
    }

    // Disables recycling for the next frame so that layout animations run well.
    // WARNING: Avoid this when making large changes to the data as the list might draw too much to run animations. Single item insertions/deletions
    // should be good. With recycling paused the list cannot do much optimization.
    // The next render will run as normal and reuse items.
    // 在下一帧禁用回收，以便布局动画运行良好。
    // 警告: 当对数据进行大量更改时避免使用此方法，因为列表可能会绘制过多内容以运行动画。单项插入/删除应该没问题。
    // 暂停回收后，列表无法进行太多优化。下一帧渲染将正常运行并重用项目。
    /**
     * 准备进行布局动画渲染
     */
    public prepareForLayoutAnimationRender(): void {
        this._virtualRenderer.setOptimizeForAnimations(true);
    }

    /**
     * 获取虚拟渲染器实例
     * @returns 虚拟渲染器实例
     */
    protected getVirtualRenderer(): VirtualRenderer {
        return this._virtualRenderer;
    }

    /**
     * 处理项目布局事件
     * @param index - 项目索引
     */
    protected onItemLayout(index: number): void {
        if (this.props.onItemLayout) {
            this.props.onItemLayout(index);
        }
    }

    /**
     * 项目布局事件处理函数
     * @param index - 项目索引
     */
    private _onItemLayout = (index: number) => {
        this.onItemLayout(index);
    }

    /**
     * 处理初始滚动偏移量
     */
    private _processInitialOffset(): void {
        if (this._pendingScrollToOffset) {
            setTimeout(() => {
                if (this._pendingScrollToOffset) {
                    const offset = this._pendingScrollToOffset;
                    this._pendingScrollToOffset = null;
                    if (this.props.isHorizontal) {
                        offset.y = 0;
                    } else {
                        offset.x = 0;
                    }
                    this.scrollToOffset(offset.x, offset.y, false, this._windowCorrectionConfig.applyToInitialOffset);
                    if (this._pendingRenderStack) {
                        this._renderStackWhenReady(this._pendingRenderStack);
                        this._pendingRenderStack = undefined;
                    }
                }
            }, 0);
        }
    }

    /**
     * 从上下文提供者获取上下文信息
     * @param props - 组件属性
     */
    private _getContextFromContextProvider(props: RecyclerListViewProps): void {
        if (props.contextProvider) {
            const uniqueKey = props.contextProvider.getUniqueKey();
            if (uniqueKey) {
                const offset = props.contextProvider.get(uniqueKey + Constants.CONTEXT_PROVIDER_OFFSET_KEY_SUFFIX);
                if (typeof offset === "number" && offset > 0) {
                    this._initialOffset = offset;
                    if (props.onRecreate) {
                        props.onRecreate({ lastOffset: this._initialOffset });
                    }
                    props.contextProvider.remove(uniqueKey + Constants.CONTEXT_PROVIDER_OFFSET_KEY_SUFFIX);
                }
                if (props.forceNonDeterministicRendering) {
                    const cachedLayouts = props.contextProvider.get(uniqueKey + Constants.CONTEXT_PROVIDER_LAYOUT_KEY_SUFFIX) as string;
                    if (cachedLayouts && typeof cachedLayouts === "string") {
                        this._cachedLayouts = JSON.parse(cachedLayouts).layoutArray;
                        props.contextProvider.remove(uniqueKey + Constants.CONTEXT_PROVIDER_LAYOUT_KEY_SUFFIX);
                    }
                }
            }
        }
    }

    /**
     * 检查并更改布局
     * @param newProps - 新的组件属性
     * @param forceFullRender - 是否强制全量渲染
     */
    private _checkAndChangeLayouts(newProps: RecyclerListViewProps, forceFullRender?: boolean): void {
        this._params.isHorizontal = newProps.isHorizontal;
        this._params.itemCount = newProps.dataProvider.getSize();
        this._virtualRenderer.setParamsAndDimensions(this._params, this._layout);
        this._virtualRenderer.setLayoutProvider(newProps.layoutProvider);
        if (newProps.dataProvider.hasStableIds() && this.props.dataProvider !== newProps.dataProvider) {
            if (newProps.dataProvider.requiresDataChangeHandling()) {
                this._virtualRenderer.handleDataSetChange(newProps.dataProvider);
            } else if (this._virtualRenderer.hasPendingAnimationOptimization()) {
                console.warn(Messages.ANIMATION_ON_PAGINATION); //tslint:disable-line
            }
        }
        if (this.props.layoutProvider !== newProps.layoutProvider || this.props.isHorizontal !== newProps.isHorizontal) {
            //TODO:Talha use old layout manager
            this._virtualRenderer.setLayoutManager(newProps.layoutProvider.createLayoutManager(this._layout, newProps.isHorizontal));
            if (newProps.layoutProvider.shouldRefreshWithAnchoring) {
                this._virtualRenderer.refreshWithAnchor();
            } else {
                this._virtualRenderer.refresh();
            }
            this._refreshViewability();
        } else if (this.props.dataProvider !== newProps.dataProvider) {
            if (newProps.dataProvider.getSize() > this.props.dataProvider.getSize()) {
                this._onEndReachedCalled = false;
            }
            const layoutManager = this._virtualRenderer.getLayoutManager();
            if (layoutManager) {
                layoutManager.relayoutFromIndex(newProps.dataProvider.getFirstIndexToProcessInternal(), newProps.dataProvider.getSize());
                this._virtualRenderer.refresh();
            }
        } else if (forceFullRender) {
            const layoutManager = this._virtualRenderer.getLayoutManager();
            if (layoutManager) {
                const cachedLayouts = layoutManager.getLayouts();
                this._virtualRenderer.setLayoutManager(newProps.layoutProvider.createLayoutManager(this._layout, newProps.isHorizontal, cachedLayouts));
                this._refreshViewability();
            }
        } else if (this._relayoutReqIndex >= 0) {
            const layoutManager = this._virtualRenderer.getLayoutManager();
            if (layoutManager) {
                const dataProviderSize = newProps.dataProvider.getSize();
                layoutManager.relayoutFromIndex(Math.min(Math.max(dataProviderSize - 1, 0), this._relayoutReqIndex), dataProviderSize);
                this._relayoutReqIndex = -1;
                this._refreshViewability();
            }
        }
    }

    /**
     * 刷新可见性
     */
    private _refreshViewability(): void {
        this._virtualRenderer.refresh();
        this._queueStateRefresh();
    }

    /**
     * 排队状态刷新请求
     */
    private _queueStateRefresh(): void {
        this.refreshRequestDebouncer(() => {
            if (this._isMounted) {
                this.setState((prevState) => {
                    return prevState;
                });
            }
        });
    }

    /**
     * 处理尺寸变化事件
     * @param layout - 新的布局尺寸
     */
    private _onSizeChanged = (layout: Dimension): void => {
        if (layout.height === 0 || layout.width === 0) {
            if (!this.props.suppressBoundedSizeException) {
                throw new CustomError(RecyclerListViewExceptions.layoutException);
            } else {
                return;
            }
        }
        if (!this.props.canChangeSize && this.props.layoutSize) {
            return;
        }
        const hasHeightChanged = this._layout.height !== layout.height;
        const hasWidthChanged = this._layout.width !== layout.width;
        this._layout.height = layout.height;
        this._layout.width = layout.width;
        if (!this._initComplete) {
            this._initComplete = true;
            this._initTrackers(this.props);
            this._processOnEndReached();
        } else {
            if ((hasHeightChanged && hasWidthChanged) ||
                (hasHeightChanged && this.props.isHorizontal) ||
                (hasWidthChanged && !this.props.isHorizontal)) {
                this._checkAndChangeLayouts(this.props, true);
            } else {
                this._refreshViewability();
            }
        }
    }

    /**
     * 如果需要，初始化状态
     * @param stack - 渲染堆栈
     * @returns 是否初始化了状态
     */
    private _initStateIfRequired(stack?: RenderStack): boolean {
        /**
         * this is to ensure that if the component does not has state and not render before
         * we still initialize the state like how we do in constructor.
         * else return false to let the caller to call setState
         * so the component can re-render to the correct stack
         * 这是为了确保如果组件没有状态且之前没有渲染过
         * 我们仍然像在构造函数中一样初始化状态。
         * 否则返回 false 让调用者调用 setState
         * 这样组件就可以重新渲染到正确的堆栈。
         */
        if (!this.state && !this.getHasRenderedOnce()) {
            this.state = {
                internalSnapshot: {},
                renderStack: stack,
            } as S;
            return true;
        }
        return false;
    }

    /**
     * 当渲染堆栈准备好时的回调函数
     * @param stack - 渲染堆栈
     */
    private _renderStackWhenReady = (stack: RenderStack): void => {
        // TODO: Flickers can further be reduced by setting _pendingScrollToOffset in constructor
        // rather than in _onSizeChanged -> _initTrackers
        // TODO: 通过在构造函数中设置 _pendingScrollToOffset 而不是在 _onSizeChanged -> _initTrackers 中设置，可以进一步减少闪烁
        if (this._pendingScrollToOffset) {
            this._pendingRenderStack = stack;
            return;
        }
        if (!this._initStateIfRequired(stack)) {
            this.setState(() => {
                return { renderStack: stack };
            });
        }
    }

    /**
     * 初始化跟踪器
     * @param props - 组件属性
     */
    private _initTrackers(props: RecyclerListViewProps): void {
        this._assertDependencyPresence(props);
        if (props.onVisibleIndexesChanged) {
            throw new CustomError(RecyclerListViewExceptions.usingOldVisibleIndexesChangedParam);
        }
        if (props.onVisibleIndicesChanged) {
            this._virtualRenderer.attachVisibleItemsListener(props.onVisibleIndicesChanged!);
        }
        this._params = {
            initialOffset: this._initialOffset ? this._initialOffset : props.initialOffset,
            initialRenderIndex: props.initialRenderIndex,
            isHorizontal: props.isHorizontal,
            itemCount: props.dataProvider.getSize(),
            renderAheadOffset: props.renderAheadOffset,
        };
        this._virtualRenderer.setParamsAndDimensions(this._params, this._layout);
        const layoutManager = props.layoutProvider.createLayoutManager(this._layout, props.isHorizontal, this._cachedLayouts);
        this._virtualRenderer.setLayoutManager(layoutManager);
        this._virtualRenderer.setLayoutProvider(props.layoutProvider);
        this._virtualRenderer.init();
        const offset = this._virtualRenderer.getInitialOffset();
        const contentDimension = layoutManager.getContentDimension();
        if ((offset.y > 0 && contentDimension.height > this._layout.height) ||
            (offset.x > 0 && contentDimension.width > this._layout.width)) {
            this._pendingScrollToOffset = offset;
            if (!this._initStateIfRequired()) {
                this.setState({});
            }
        } else {
            this._virtualRenderer.startViewabilityTracker(this._getWindowCorrection(offset.x, offset.y, props));
        }
    }

    /**
     * 获取窗口校正值
     * @param offsetX - 水平偏移量
     * @param offsetY - 垂直偏移量
     * @param props - 组件属性
     * @returns 窗口校正值
     */
    private _getWindowCorrection(offsetX: number, offsetY: number, props: RecyclerListViewProps): WindowCorrection {
        return (props.applyWindowCorrection && props.applyWindowCorrection(offsetX, offsetY, this._windowCorrectionConfig.value))
                || this._windowCorrectionConfig.value;
    }

    /**
     * 检查依赖项是否存在
     * @param props - 组件属性
     */
    private _assertDependencyPresence(props: RecyclerListViewProps): void {
        if (!props.dataProvider || !props.layoutProvider) {
            throw new CustomError(RecyclerListViewExceptions.unresolvedDependenciesException);
        }
    }

    /**
     * 检查项目类型是否有效
     * @param type - 项目类型
     */
    private _assertType(type: string | number): void {
        if (!type && type !== 0) {
            throw new CustomError(RecyclerListViewExceptions.itemTypeNullException);
        }
    }

    /**
     * 检查数据是否发生变化
     * @param row1 - 第一行数据
     * @param row2 - 第二行数据
     * @returns 数据是否发生变化
     */
    private _dataHasChanged = (row1: any, row2: any): boolean => {
        return this.props.dataProvider.rowHasChanged(row1, row2);
    }

    /**
     * 使用元数据渲染行
     * @param itemMeta - 项目元数据
     * @returns 渲染的 JSX 元素或 null
     */
    private _renderRowUsingMeta(itemMeta: RenderStackItem): JSX.Element | null {
        const dataSize = this.props.dataProvider.getSize();
        const dataIndex = itemMeta.dataIndex;
        if (!ObjectUtil.isNullOrUndefined(dataIndex) && dataIndex < dataSize) {
            const itemRect = (this._virtualRenderer.getLayoutManager() as LayoutManager).getLayouts()[dataIndex];
            const data = this.props.dataProvider.getDataForIndex(dataIndex);
            const type = this.props.layoutProvider.getLayoutTypeForIndex(dataIndex);
            const key = this._virtualRenderer.syncAndGetKey(dataIndex);
            const styleOverrides = (this._virtualRenderer.getLayoutManager() as LayoutManager).getStyleOverridesForIndex(dataIndex);
            this._assertType(type);
            if (!this.props.forceNonDeterministicRendering) {
                this._checkExpectedDimensionDiscrepancy(itemRect, type, dataIndex);
            }
            return (
                <ViewRenderer key={key} data={data}
                    dataHasChanged={this._dataHasChanged}
                    x={itemRect.x}
                    y={itemRect.y}
                    layoutType={type}
                    index={dataIndex}
                    styleOverrides={styleOverrides}
                    layoutProvider={this.props.layoutProvider}
                    forceNonDeterministicRendering={this.props.forceNonDeterministicRendering}
                    isHorizontal={this.props.isHorizontal}
                    onSizeChanged={this._onViewContainerSizeChange}
                    childRenderer={this.props.rowRenderer}
                    height={itemRect.height}
                    width={itemRect.width}
                    itemAnimator={Default.value<ItemAnimator>(this.props.itemAnimator, this._defaultItemAnimator)}
                    extendedState={this.props.extendedState}
                    internalSnapshot={this.state.internalSnapshot}
                    renderItemContainer={this.props.renderItemContainer}
                    onItemLayout={this._onItemLayout}/>
            );
        }
        return null;
    }

    /**
     * 处理视图容器尺寸变化事件
     * @param dim - 新的尺寸
     * @param index - 项目索引
     */
    private _onViewContainerSizeChange = (dim: Dimension, index: number): void => {
        //Cannot be null here
        // 这里不可能为 null
        const layoutManager: LayoutManager = this._virtualRenderer.getLayoutManager() as LayoutManager;

        if (this.props.debugHandlers && this.props.debugHandlers.resizeDebugHandler) {
            const itemRect = layoutManager.getLayouts()[index];
            this.props.debugHandlers.resizeDebugHandler.resizeDebug({
                width: itemRect.width,
                height: itemRect.height,
            }, dim, index);
        }

        // Add extra protection for overrideLayout as it can only be called when non-deterministic rendering is used.
        // 为 overrideLayout 添加额外保护，因为只有在使用非确定性渲染时才能调用它。
        if (this.props.forceNonDeterministicRendering && layoutManager.overrideLayout(index, dim)) {
            if (this._relayoutReqIndex === -1) {
                this._relayoutReqIndex = index;
            } else {
                this._relayoutReqIndex = Math.min(this._relayoutReqIndex, index);
            }
            this._queueStateRefresh();
        }
    }

    /**
     * 检查预期尺寸差异
     * @param itemRect - 项目矩形
     * @param type - 项目类型
     * @param index - 项目索引
     */
    private _checkExpectedDimensionDiscrepancy(itemRect: Dimension, type: string | number, index: number): void {
        if (this.props.layoutProvider.checkDimensionDiscrepancy(itemRect, type, index)) {
            if (this._relayoutReqIndex === -1) {
                this._relayoutReqIndex = index;
            } else {
                this._relayoutReqIndex = Math.min(this._relayoutReqIndex, index);
            }
        }
    }

    /**
     * 生成渲染堆栈
     * @returns 渲染的 JSX 元素数组
     */
    private _generateRenderStack(): Array<JSX.Element | null> {
        const renderedItems = [];
        if (this.state) {
            for (const key in this.state.renderStack) {
                if (this.state.renderStack.hasOwnProperty(key)) {
                    renderedItems.push(this._renderRowUsingMeta(this.state.renderStack[key]));
                }
            }
        }
        return renderedItems;
    }

    /**
     * 处理滚动事件
     * @param offsetX - 水平偏移量
     * @param offsetY - 垂直偏移量
     * @param rawEvent - 原始滚动事件
     */
    private _onScroll = (offsetX: number, offsetY: number, rawEvent: ScrollEvent): void => {
        // correction to be positive to shift offset upwards; negative to push offset downwards.
        // extracting the correction value from logical offset and updating offset of virtual renderer.
        // 校正值为正表示向上偏移；为负表示向下偏移。
        // 从逻辑偏移量中提取校正值并更新虚拟渲染器的偏移量。
        this._virtualRenderer.updateOffset(offsetX, offsetY, true, this._getWindowCorrection(offsetX, offsetY, this.props));

        if (this.props.onScroll) {
            this.props.onScroll(rawEvent, offsetX, offsetY);
        }
        this._processOnEndReached();
    }

    /**
     * 处理滚动到底部的回调
     */
    private _processOnEndReached(): void {
        if (this.props.onEndReached && this._virtualRenderer) {
            const layout = this._virtualRenderer.getLayoutDimension();
            const viewabilityTracker = this._virtualRenderer.getViewabilityTracker();
            if (viewabilityTracker) {
                const windowBound = this.props.isHorizontal ? layout.width - this._layout.width : layout.height - this._layout.height;
                const lastOffset = viewabilityTracker ? viewabilityTracker.getLastOffset() : 0;
                const threshold = windowBound - lastOffset;

                const listLength = this.props.isHorizontal ? this._layout.width : this._layout.height;
                const triggerOnEndThresholdRelative = listLength * Default.value<number>(this.props.onEndReachedThresholdRelative, 0);
                const triggerOnEndThreshold = Default.value<number>(this.props.onEndReachedThreshold, 0);

                if (threshold <= triggerOnEndThresholdRelative || threshold <= triggerOnEndThreshold) {
                    if (this.props.onEndReached && !this._onEndReachedCalled) {
                        this._onEndReachedCalled = true;
                        this.props.onEndReached();
                    }
                } else {
                    this._onEndReachedCalled = false;
                }
            }
        }
    }
}

// 属性类型定义
RecyclerListView.propTypes = {

    //Refer the sample
    // 参考示例
    // 布局提供者，必须是 BaseLayoutProvider 的实例
    layoutProvider: PropTypes.instanceOf(BaseLayoutProvider).isRequired,

    //Refer the sample
    // 参考示例
    // 数据提供者，必须是 BaseDataProvider 的实例
    dataProvider: PropTypes.instanceOf(BaseDataProvider).isRequired,

    //Used to maintain scroll position in case view gets destroyed e.g, cases of back navigation
    // 用于在视图销毁时维护滚动位置，例如返回导航的情况
    // 上下文提供者，可选，必须是 ContextProvider 的实例
    contextProvider: PropTypes.instanceOf(ContextProvider),

    //Methods which returns react component to be rendered. You get type of view and data in the callback.
    // 返回要渲染的 React 组件的方法。在回调中可以获取视图类型和数据。
    // 行渲染器，必须是函数
    rowRenderer: PropTypes.func.isRequired,

    //Initial offset you want to start rendering from, very useful if you want to maintain scroll context across pages.
    // 你希望从哪个初始偏移量开始渲染，如果你想在页面间维护滚动上下文，这非常有用。
    // 初始偏移量，可选，必须是数字
    initialOffset: PropTypes.number,

    //Specify how many pixels in advance do you want views to be rendered. Increasing this value can help reduce blanks (if any). However keeping this as low
    //as possible should be the intent. Higher values also increase re-render compute
    // 指定你希望提前渲染多少像素的视图。增加这个值可以帮助减少空白（如果有的话）。然而，应尽量保持这个值尽可能低。
    // 较高的值也会增加重新渲染的计算量。
    // 预渲染偏移量，可选，必须是数字
    renderAheadOffset: PropTypes.number,

    //Whether the listview is horizontally scrollable. Both use staggeredGrid implementation
    // 列表视图是否可以水平滚动。两者都使用交错网格实现。
    // 是否为水平滚动列表，可选，必须是布尔值
    isHorizontal: PropTypes.bool,

    //On scroll callback onScroll(rawEvent, offsetX, offsetY), note you get offsets no need to read scrollTop/scrollLeft
    // 滚动回调函数 onScroll(rawEvent, offsetX, offsetY)，注意你可以直接获取偏移量，无需读取 scrollTop/scrollLeft。
    // 滚动事件回调函数，可选，必须是函数
    onScroll: PropTypes.func,

    //callback onRecreate(params), when recreating recycler view from context provider. Gives you the initial params in the first
    //frame itself to allow you to render content accordingly
    // 当从上下文提供者重新创建 Recycler 视图时的回调函数 onRecreate(params)。在第一帧就会给你初始参数，
    // 以便你可以相应地渲染内容。
    // 重新创建列表时的回调函数，可选，必须是函数
    onRecreate: PropTypes.func,

    //Provide your own ScrollView Component. The contract for the scroll event should match the native scroll event contract, i.e.
    // 提供你自己的 ScrollView 组件。滚动事件的契约应与原生滚动事件契约匹配，即：
    // scrollEvent = { nativeEvent: { contentOffset: { x: offset, y: offset } } }
    //Note: Please extend BaseScrollView to achieve expected behaviour
    // 注意：请继承 BaseScrollView 以实现预期的行为。
    // 外部滚动视图组件，可选，必须是函数或对象
    externalScrollView: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),

    //Callback given when user scrolls to the end of the list or footer just becomes visible, useful in incremental loading scenarios
    // 当用户滚动到列表末尾或页脚刚刚可见时提供的回调函数，在增量加载场景中很有用。
    // 滚动到底部的回调函数，可选，必须是函数
    onEndReached: PropTypes.func,

    //Specify how many pixels in advance you onEndReached callback
    // 指定在多远的像素距离触发 onEndReached 回调。
    // 滚动到底部的阈值（像素），可选，必须是数字
    onEndReachedThreshold: PropTypes.number,

    //Specify how far from the end (in units of visible length of the list)
    //the bottom edge of the list must be from the end of the content to trigger the onEndReached callback
    // 指定列表底部边缘距离内容末尾多远（以列表可见长度为单位）
    // 时触发 onEndReached 回调。
    // 滚动到底部的相对阈值（相对于可见列表长度），可选，必须是数字
    onEndReachedThresholdRelative: PropTypes.number,

    //Deprecated. Please use onVisibleIndicesChanged instead.
    // 已弃用。请使用 onVisibleIndicesChanged 代替。
    // 可见索引变化的回调函数，可选，必须是函数
    onVisibleIndexesChanged: PropTypes.func,

    //Provides visible index, helpful in sending impression events etc, onVisibleIndicesChanged(all, now, notNow)
    // 提供可见索引，有助于发送展示事件等，onVisibleIndicesChanged(all, now, notNow)
    // 可见索引变化的回调函数，可选，必须是函数
    onVisibleIndicesChanged: PropTypes.func,

    //Provide this method if you want to render a footer. Helpful in showing a loader while doing incremental loads.
    // 如果你想渲染页脚，请提供此方法。在增量加载时显示加载器很有用。
    // 渲染页脚的函数，可选，必须是函数
    renderFooter: PropTypes.func,

    //Specify the initial item index you want rendering to start from. Preferred over initialOffset if both are specified.
    // 指定你希望从哪个初始项目索引开始渲染。如果同时指定了 initialOffset 和 initialRenderIndex，
    // 则优先使用 initialRenderIndex。
    // 初始渲染索引，可选，必须是数字
    initialRenderIndex: PropTypes.number,

    //Specify the estimated size of the recyclerlistview to render the list items in the first pass. If provided, recyclerlistview will
    //use these dimensions to fill in the items in the first render. If not provided, recyclerlistview will first render with no items
    //and then fill in the items based on the size given by its onLayout event. canChangeSize can be set to true to relayout items when
    //the size changes.
    // 指定 RecyclerListView 的估计大小，以便在第一次渲染时渲染列表项。如果提供了，RecyclerListView 将
    // 使用这些尺寸在第一次渲染时填充项目。如果未提供，RecyclerListView 将首先渲染为空，然后根据
    // 其 onLayout 事件提供的大小填充项目。可以将 canChangeSize 设置为 true，以便在大小变化时重新布局项目。
    // 列表的布局尺寸，可选，必须是对象
    layoutSize: PropTypes.object,

    //iOS only. Scroll throttle duration.
    // 仅适用于 iOS。滚动节流持续时间。
    // 滚动节流时间（iOS 专用），可选，必须是数字
    scrollThrottle: PropTypes.number,

    //Specify if size can change, listview will automatically relayout items. For web, works only with useWindowScroll = true
    // 指定大小是否可以更改，列表视图将自动重新布局项目。对于网页，仅在 useWindowScroll = true 时有效。
    // 是否允许列表大小改变，可选，必须是布尔值
    canChangeSize: PropTypes.bool,

    //Web only. Layout elements in window instead of a scrollable div.
    // 仅适用于网页。在窗口中布局元素，而不是在可滚动的 div 中。
    // 是否使用窗口滚动（Web 专用），可选，必须是布尔值
    useWindowScroll: PropTypes.bool,

    //Turns off recycling. You still get progressive rendering and all other features. Good for lazy rendering. This should not be used in most cases.
    // 关闭回收功能。你仍然可以获得渐进式渲染和所有其他功能。适用于懒加载。在大多数情况下不应使用此功能。
    // 是否禁用回收机制，可选，必须是布尔值
    disableRecycling: PropTypes.bool,

    //Default is false, if enabled dimensions provided in layout provider will not be strictly enforced.
    //Rendered dimensions will be used to relayout items. Slower if enabled.
    // 默认值为 false，如果启用，布局提供者中提供的尺寸将不会被严格强制执行。
    // 将使用渲染的尺寸重新布局项目。启用此功能会降低性能。
    // 是否强制非确定性渲染，可选，必须是布尔值
    forceNonDeterministicRendering: PropTypes.bool,

    //In some cases the data passed at row level may not contain all the info that the item depends upon, you can keep all other info
    //outside and pass it down via this prop. Changing this object will cause everything to re-render. Make sure you don't change
    //it often to ensure performance. Re-renders are heavy.
    // 在某些情况下，行级传递的数据可能不包含项目依赖的所有信息，你可以将所有其他信息
    // 保存在外部，并通过此属性传递。更改此对象将导致所有内容重新渲染。请确保不要频繁更改
    // 它以确保性能。重新渲染的开销很大。
    // 扩展状态对象，可选，必须是对象
    extendedState: PropTypes.object,

    //Enables animating RecyclerListView item cells e.g, shift, add, remove etc. This prop can be used to pass an external item animation implementation.
    //Look into BaseItemAnimator/DefaultJSItemAnimator/DefaultNativeItemAnimator/DefaultWebItemAnimator for more info.
    //By default there are few animations, to disable completely simply pass blank new BaseItemAnimator() object. Remember, create
    //one object and keep it do not create multiple object of type BaseItemAnimator.
    //Note: You might want to look into DefaultNativeItemAnimator to check an implementation based on LayoutAnimation. By default,
    //animations are JS driven to avoid workflow interference. Also, please note LayoutAnimation is buggy on Android.
    // 启用对 RecyclerListView 项目单元格的动画效果，例如移动、添加、删除等。可以使用此属性传递外部项目动画实现。
    // 请参考 BaseItemAnimator/DefaultJSItemAnimator/DefaultNativeItemAnimator/DefaultWebItemAnimator 以获取更多信息。
    // 默认情况下有一些动画效果，要完全禁用，只需传递一个空的 BaseItemAnimator() 对象。请记住，创建
    // 一个对象并保持使用，不要创建多个 BaseItemAnimator 类型的对象。
    // 注意：你可能想查看 DefaultNativeItemAnimator 以了解基于 LayoutAnimation 的实现。默认情况下，
    // 动画是由 JS 驱动的，以避免工作流干扰。另外，请注意 LayoutAnimation 在 Android 上有问题。
    // 项目动画器，可选，必须是 BaseItemAnimator 的实例
    itemAnimator: PropTypes.instanceOf(BaseItemAnimator),

    //All of the Recyclerlistview item cells are enclosed inside this item container. The idea is pass a native UI component which implements a
    //view shifting algorithm to remove the overlaps between the neighbouring views. This is achieved by shifting them by the appropriate
    //amount in the correct direction if the estimated sizes of the item cells are not accurate. If this props is passed, it will be used to
    //enclose the list items and otherwise a default react native View will be used for the same.
    // 所有 RecyclerListView 项目单元格都包含在这个项目容器中。其目的是传递一个原生 UI 组件，该组件实现
    // 一个视图移动算法，以消除相邻视图之间的重叠。如果项目单元格的估计大小不准确，通过在正确的方向上
    // 移动适当的量来实现这一点。如果传递了此属性，它将用于包含列表项，否则将使用默认的 React Native View。
    // 渲染内容容器的函数，可选，必须是函数
    renderContentContainer: PropTypes.func,

    //This container is for wrapping individual cells that are being rendered by recyclerlistview unlike contentContainer which wraps all of them.
    // 这个容器用于包装 RecyclerListView 正在渲染的单个单元格，而 contentContainer 用于包装所有单元格。
    // 渲染项目容器的函数，可选，必须是函数
    renderItemContainer: PropTypes.func,

    //Deprecated in favour of `prepareForLayoutAnimationRender` method
    // 已弃用，建议使用 `prepareForLayoutAnimationRender` 方法
    // 是否优化插入和删除动画，可选，必须是布尔值
    optimizeForInsertDeleteAnimations: PropTypes.bool,

    //To pass down style to inner ScrollView
    // 向下传递样式到内部 ScrollView
    // 样式对象或数字，可选，必须是对象或数字
    style: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.number,
    ]),
    //For TS use case, not necessary with JS use.
    //For all props that need to be proxied to inner/external scrollview. Put them in an object and they'll be spread
    //and passed down.
    // 对于 TypeScript 使用场景，对于 JavaScript 使用不是必需的。
    // 所有需要代理到内部/外部滚动视图的属性。将它们放在一个对象中，它们将被展开并传递下去。
    // 传递给内部/外部滚动视图的属性对象，可选，必须是对象
    scrollViewProps: PropTypes.object,

    // Used when the logical offsetY differs from actual offsetY of recyclerlistview, could be because some other component is overlaying the recyclerlistview.
    // For e.x. toolbar within CoordinatorLayout are overlapping the recyclerlistview.
    // This method exposes the windowCorrection object of RecyclerListView, user can modify the values in realtime.
    // 当 RecyclerListView 的逻辑偏移量 offsetY 与实际偏移量不同时使用，可能是因为其他组件覆盖了 RecyclerListView。
    // 例如，CoordinatorLayout 中的工具栏覆盖了 RecyclerListView。
    // 此方法暴露了 RecyclerListView 的 windowCorrection 对象，用户可以实时修改这些值。
    // 应用窗口校正的函数，可选，必须是函数
    applyWindowCorrection: PropTypes.func,

    // This can be used to hook an itemLayoutListener to listen to which item at what index is layout.
    // To get the layout params of the item, you can use the ref to call method getLayout(index), e.x. : `this._recyclerRef.getLayout(index)`
    // but there is a catch here, since there might be a pending relayout due to which the queried layout might not be precise.
    // Caution: RLV only listens to layout changes if forceNonDeterministicRendering is true
    // 这可以用于挂钩一个 itemLayoutListener，以监听哪个项目在哪个索引处进行布局。
    // 要获取项目的布局参数，你可以使用引用调用 getLayout(index) 方法，例如：`this._recyclerRef.getLayout(index)`
    // 但这里有一个问题，由于可能存在待处理的重新布局，查询的布局可能不准确。
    // 注意：只有在 forceNonDeterministicRendering 为 true 时，RLV 才会监听布局变化。
    // 项目布局回调函数，可选，必须是函数
    onItemLayout: PropTypes.func,

    //Used to specify is window correction config and whether it should be applied to some scroll events
    // 用于指定窗口校正配置以及是否应将其应用于某些滚动事件
    // 窗口校正配置对象，可选，必须是对象
    windowCorrectionConfig: PropTypes.object,
};
