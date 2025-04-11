/**
 * Created by ananya.chandra on 20/09/18.
 * 由 ananya.chandra 创建于 2018/09/20
 */

/** 导入 React 核心库 */
import * as React from "react";
/** 导入 React Native 动画和样式类型 */
import { Animated, StyleProp, ViewStyle } from "react-native";
/** 导入布局管理器相关类型 */
import { Layout } from "../layoutmanager/LayoutManager";
/** 导入尺寸接口 */
import { Dimension } from "../dependencies/LayoutProvider";
/** 导入异常定义 */
import RecyclerListViewExceptions from "../exceptions/RecyclerListViewExceptions";
/** 导入自定义错误类 */
import CustomError from "../exceptions/CustomError";
/** 导入组件兼容工具 */
import { ComponentCompat } from "../../utils/ComponentCompat";
/** 导入窗口校正类型 */
import { WindowCorrection } from "../ViewabilityTracker";

/** 粘性类型枚举 */
export enum StickyType {
    /** 头部类型 */
    HEADER,
    /** 底部类型 */
    FOOTER,
}

/** 粘性对象属性接口 */
export interface StickyObjectProps {
    /** 粘性索引数组 */
    stickyIndices: number[] | undefined;
    /** 获取指定索引的布局 */
    getLayoutForIndex: (index: number) => Layout | undefined;
    /** 获取指定索引的数据 */
    getDataForIndex: (index: number) => any;
    /** 获取指定索引的布局类型 */
    getLayoutTypeForIndex: (index: number) => string | number;
    /** 获取扩展状态 */
    getExtendedState: () => object | undefined;
    /** 获取 RLV 渲染尺寸 */
    getRLVRenderedSize: () => Dimension | undefined;
    /** 获取内容尺寸 */
    getContentDimension: () => Dimension | undefined;
    /** 获取行渲染器 */
    getRowRenderer: () => ((type: string | number, data: any, index: number, extendedState?: object) => JSX.Element | JSX.Element[] | null);
    /** 覆盖行渲染器（可选） */
    overrideRowRenderer?: (type: string | number | undefined, data: any, index: number, extendedState?: object) => JSX.Element | JSX.Element[] | null;
    /** 渲染容器（可选） */
    renderContainer?: ((rowContent: JSX.Element, index: number, extendState?: object) => JSX.Element | null);
    /** 获取窗口校正（可选） */
    getWindowCorrection?: () => WindowCorrection;
}

/** 粘性对象抽象基类 */
export default abstract class StickyObject<P extends StickyObjectProps> extends ComponentCompat<P> {
    /** 粘性类型，默认为头部 */
    protected stickyType: StickyType = StickyType.HEADER;
    /** 粘性类型乘数 */
    protected stickyTypeMultiplier: number = 1;
    /** 粘性视图可见性 */
    protected stickyVisiblity: boolean = false;
    /** 容器位置样式 */
    protected containerPosition: StyleProp<ViewStyle>;
    /** 当前索引 */
    protected currentIndex: number = 0;
    /** 当前粘性索引 */
    protected currentStickyIndex: number = 0;
    /** 可见索引数组 */
    protected visibleIndices: number[] = [];
    /** 是否处于弹性滚动状态 */
    protected bounceScrolling: boolean = false;

    /** 前一个布局 */
    private _previousLayout: Layout | undefined;
    /** 前一个高度 */
    private _previousHeight: number | undefined;
    /** 下一个布局 */
    private _nextLayout: Layout | undefined;
    /** 下一个Y坐标 */
    private _nextY: number | undefined;
    /** 下一个高度 */
    private _nextHeight: number | undefined;
    /** 当前布局 */
    private _currentLayout: Layout | undefined;
    /** 当前Y坐标 */
    private _currentY: number | undefined;
    /** 当前高度 */
    private _currentHeight: number | undefined;

    /** 下一个Y轴距离 */
    private _nextYd: number | undefined;
    /** 当前Y轴距离 */
    private _currentYd: number | undefined;
    /** 可滚动高度 */
    private _scrollableHeight: number | undefined;
    /** 可滚动宽度 */
    private _scrollableWidth: number | undefined;
    /** 窗口边界 */
    private _windowBound: number | undefined;

    /** 粘性视图偏移量动画值 */
    private _stickyViewOffset: Animated.Value = new Animated.Value(0);
    /** 前一个粘性索引 */
    private _previousStickyIndex: number = 0;
    /** 下一个粘性索引 */
    private _nextStickyIndex: number = 0;
    /** 是否首次计算 */
    private _firstCompute: boolean = true;
    /** 最小可见索引 */
    private _smallestVisibleIndex: number = 0;
    /** 最大可见索引 */
    private _largestVisibleIndex: number = 0;
    /** Y轴偏移量 */
    private _offsetY: number = 0;
    /** 窗口校正对象 */
    private _windowCorrection: WindowCorrection = {
        startCorrection: 0, endCorrection: 0, windowShift: 0,
    };

    /** 构造函数 */
    constructor(props: P, context?: any) {
        super(props, context);
    }

    /** 组件将接收新属性时的处理方法 */
    public componentWillReceivePropsCompat(newProps: StickyObjectProps): void {
        this._updateDimensionParams();
        this.calculateVisibleStickyIndex(newProps.stickyIndices, this._smallestVisibleIndex, this._largestVisibleIndex,
            this._offsetY, this._windowBound);
        this._computeLayouts(newProps.stickyIndices);
        this.stickyViewVisible(this.stickyVisiblity, false);
    }

    /** 渲染组件 */
    public renderCompat(): JSX.Element | null {
        // Add the container style if renderContainer is undefined
        // 如果未定义 renderContainer，则添加容器样式

        const containerStyle = [{ transform: [{ translateY: this._stickyViewOffset }] },
            (!this.props.renderContainer && [{ position: "absolute", width: this._scrollableWidth }, this.containerPosition])];

        const content = (
            <Animated.View style={containerStyle}>
                {this.stickyVisiblity ? this._renderSticky() : null}
            </Animated.View>
        );

        if (this.props.renderContainer) {
            const _extendedState: any = this.props.getExtendedState();
            return this.props.renderContainer(content, this.currentStickyIndex, _extendedState);
        } else {
            return (content);
        }
    }

    /** 可见索引变化处理方法 */
    public onVisibleIndicesChanged(all: number[]): void {
        if (this._firstCompute) {
            this.initStickyParams();
            this._offsetY = this._getAdjustedOffsetY(this._offsetY);
            this._firstCompute = false;
        }
        this._updateDimensionParams();
        this._setSmallestAndLargestVisibleIndices(all);
        this.calculateVisibleStickyIndex(this.props.stickyIndices, this._smallestVisibleIndex, this._largestVisibleIndex,
            this._offsetY, this._windowBound);
        this._computeLayouts();
        this.stickyViewVisible(this.stickyVisiblity);
    }

    /** 滚动事件处理方法 */
    public onScroll(offsetY: number): void {
        offsetY = this._getAdjustedOffsetY(offsetY);
        this._offsetY = offsetY;
        this._updateDimensionParams();
        this.boundaryProcessing(offsetY, this._windowBound);
        if (this._previousStickyIndex !== undefined) {
            if (this._previousStickyIndex * this.stickyTypeMultiplier >= this.currentStickyIndex * this.stickyTypeMultiplier) {
                throw new CustomError(RecyclerListViewExceptions.stickyIndicesArraySortError);
            }
            const scrollY: number | undefined = this.getScrollY(offsetY, this._scrollableHeight);
            if (this._previousHeight && this._currentYd && scrollY && scrollY < this._currentYd) {
                if (scrollY > this._currentYd - this._previousHeight) {
                    this.currentIndex -= this.stickyTypeMultiplier;
                    const translate = (scrollY - this._currentYd + this._previousHeight) * (-1 * this.stickyTypeMultiplier);
                    this._stickyViewOffset.setValue(translate);
                    this._computeLayouts();
                    this.stickyViewVisible(true);
                }
            } else {
                this._stickyViewOffset.setValue(0);
            }
        }
        if (this._nextStickyIndex !== undefined) {
            if (this._nextStickyIndex * this.stickyTypeMultiplier <= this.currentStickyIndex * this.stickyTypeMultiplier) {
                throw new CustomError(RecyclerListViewExceptions.stickyIndicesArraySortError);
            }
            const scrollY: number | undefined = this.getScrollY(offsetY, this._scrollableHeight);
            if (this._currentHeight && this._nextYd && scrollY && scrollY + this._currentHeight > this._nextYd) {
                if (scrollY <= this._nextYd) {
                    const translate = (scrollY - this._nextYd + this._currentHeight) * (-1 * this.stickyTypeMultiplier);
                    this._stickyViewOffset.setValue(translate);
                } else if (scrollY > this._nextYd) {
                    this.currentIndex += this.stickyTypeMultiplier;
                    this._stickyViewOffset.setValue(0);
                    this._computeLayouts();
                    this.stickyViewVisible(true);
                }
            } else {
                this._stickyViewOffset.setValue(0);
            }
        }
    }

    /** 抽象方法：判断是否到达边界 */
    protected abstract hasReachedBoundary(offsetY: number, windowBound?: number): boolean;
    /** 抽象方法：初始化粘性参数 */
    protected abstract initStickyParams(): void;
    /** 抽象方法：计算可见的粘性索引 */
    protected abstract calculateVisibleStickyIndex(
        stickyIndices: number[] | undefined, smallestVisibleIndex: number, largestVisibleIndex: number, offsetY: number, windowBound?: number): void;
    /** 抽象方法：获取下一个Y轴距离 */
    protected abstract getNextYd(_nextY: number, nextHeight: number): number;
    /** 抽象方法：获取当前Y轴距离 */
    protected abstract getCurrentYd(currentY: number, currentHeight: number): number;
    /** 抽象方法：获取滚动Y轴位置 */
    protected abstract getScrollY(offsetY: number, scrollableHeight?: number): number | undefined;

    /** 设置粘性视图可见性 */
    protected stickyViewVisible(_visible: boolean, shouldTriggerRender: boolean = true): void {
        this.stickyVisiblity = _visible;
        if (shouldTriggerRender) {
            this.setState({});
        }
    }

    /** 获取窗口校正 */
    protected getWindowCorrection(props: StickyObjectProps): WindowCorrection {
        return (props.getWindowCorrection && props.getWindowCorrection()) || this._windowCorrection;
    }

    /** 边界处理 */
    protected boundaryProcessing(offsetY: number, windowBound?: number): void {
        const hasReachedBoundary: boolean = this.hasReachedBoundary(offsetY, windowBound);
        if (this.bounceScrolling !== hasReachedBoundary) {
            this.bounceScrolling = hasReachedBoundary;
            if (this.bounceScrolling) {
                this.stickyViewVisible(false);
            } else {
                this.onVisibleIndicesChanged(this.visibleIndices);
            }
        }
    }

    /** 更新尺寸参数 */
    private _updateDimensionParams(): void {
        const rlvDimension: Dimension | undefined = this.props.getRLVRenderedSize();
        if (rlvDimension) {
            this._scrollableHeight = rlvDimension.height;
            this._scrollableWidth = rlvDimension.width;
        }
        const contentDimension: Dimension | undefined = this.props.getContentDimension();
        if (contentDimension && this._scrollableHeight) {
            this._windowBound = contentDimension.height - this._scrollableHeight;
        }
    }

    /** 计算布局 */
    private _computeLayouts(newStickyIndices?: number[]): void {
        const stickyIndices: number[] | undefined = newStickyIndices ? newStickyIndices : this.props.stickyIndices;
        if (stickyIndices) {
            this.currentStickyIndex = stickyIndices[this.currentIndex];
            this._previousStickyIndex = stickyIndices[this.currentIndex - this.stickyTypeMultiplier];
            this._nextStickyIndex = stickyIndices[this.currentIndex + this.stickyTypeMultiplier];
            if (this.currentStickyIndex !== undefined) {
                this._currentLayout = this.props.getLayoutForIndex(this.currentStickyIndex);
                this._currentY = this._currentLayout ? this._currentLayout.y : undefined;
                this._currentHeight = this._currentLayout ? this._currentLayout.height : undefined;
                this._currentYd = this._currentY && this._currentHeight ? this.getCurrentYd(this._currentY, this._currentHeight) : undefined;
            }
            if (this._previousStickyIndex !== undefined) {
                this._previousLayout = this.props.getLayoutForIndex(this._previousStickyIndex);
                this._previousHeight = this._previousLayout ? this._previousLayout.height : undefined;
            }
            if (this._nextStickyIndex !== undefined) {
                this._nextLayout = this.props.getLayoutForIndex(this._nextStickyIndex);
                this._nextY = this._nextLayout ? this._nextLayout.y : undefined;
                this._nextHeight = this._nextLayout ? this._nextLayout.height : undefined;
                this._nextYd = this._nextY && this._nextHeight ? this.getNextYd(this._nextY, this._nextHeight) : undefined;
            }
        }
    }

    /** 私有方法：设置最小和最大可见索引 */
    private _setSmallestAndLargestVisibleIndices(indicesArray: number[]): void {
        this.visibleIndices = indicesArray;
        this._smallestVisibleIndex = indicesArray[0];
        this._largestVisibleIndex = indicesArray[indicesArray.length - 1];
    }

    /** 私有方法：渲染粘性视图 */
    private _renderSticky(): JSX.Element | JSX.Element[] | null {
        if (this.currentStickyIndex !== undefined) {
            const _stickyData: any = this.props.getDataForIndex(this.currentStickyIndex);
            const _stickyLayoutType: string | number = this.props.getLayoutTypeForIndex(this.currentStickyIndex);
            const _extendedState: object | undefined = this.props.getExtendedState();
            const _rowRenderer: ((type: string | number, data: any, index: number, extendedState?: object)
                => JSX.Element | JSX.Element[] | null) = this.props.getRowRenderer();
            if (this.props.overrideRowRenderer) {
                return this.props.overrideRowRenderer(_stickyLayoutType, _stickyData, this.currentStickyIndex, _extendedState);
            } else {
                return _rowRenderer(_stickyLayoutType, _stickyData, this.currentStickyIndex, _extendedState);
            }
        }
        return null;
    }

    /**
     * 私有方法：获取调整后的Y轴偏移量
     * @param offsetY 原始Y轴偏移量
     */
    private _getAdjustedOffsetY(offsetY: number): number {
        return offsetY + this.getWindowCorrection(this.props).windowShift;
    }
}
