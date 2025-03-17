/** 导入 React 核心库 */
import * as React from "react";
/** 导入布局提供者相关类型 */
import { Dimension, BaseLayoutProvider } from "../dependencies/LayoutProvider";
/** 导入项目动画器 */
import ItemAnimator from "../ItemAnimator";
/** 导入组件兼容工具 */
import { ComponentCompat } from "../../utils/ComponentCompat";

/***
 * View renderer is responsible for creating a container of size provided by LayoutProvider and render content inside it.
 * Also enforces a logic to prevent re renders. RecyclerListView keeps moving these ViewRendereres around using transforms to enable recycling.
 * View renderer will only update if its position, dimensions or given data changes. Make sure to have a relevant shouldComponentUpdate as well.
 * This is second of the two things recycler works on. Implemented both for web and react native.
 * 
 * 视图渲染器负责创建一个由布局提供者指定大小的容器，并在其中渲染内容。
 * 同时强制执行防止重复渲染的逻辑。RecyclerListView 通过变换来移动这些视图渲染器以实现回收。
 * 视图渲染器仅在其位置、尺寸或给定数据发生变化时才会更新。请确保也有相关的 shouldComponentUpdate。
 * 这是回收器工作的两个要素中的第二个。同时适用于 web 和 react native。
 */

/** 视图渲染器属性接口 */
export interface ViewRendererProps<T> {
    /** X轴坐标 */
    x: number;
    /** Y轴坐标 */
    y: number;
    /** 高度 */
    height: number;
    /** 宽度 */
    width: number;
    /** 子项渲染器函数 */
    childRenderer: (type: string | number, data: T, index: number, extendedState?: object) => JSX.Element | JSX.Element[] | null;
    /** 布局类型 */
    layoutType: string | number;
    /** 数据变化比较函数 */
    dataHasChanged: (r1: T, r2: T) => boolean;
    /** 尺寸变化回调 */
    onSizeChanged: (dim: Dimension, index: number) => void;
    /** 数据 */
    data: any;
    /** 索引 */
    index: number;
    /** 项目动画器 */
    itemAnimator: ItemAnimator;
    /** 样式覆盖对象 */
    styleOverrides?: object;
    /** 是否强制非确定性渲染 */
    forceNonDeterministicRendering?: boolean;
    /** 是否水平布局 */
    isHorizontal?: boolean;
    /** 扩展状态 */
    extendedState?: object;
    /** 内部快照 */
    internalSnapshot?: object;
    /** 布局提供者 */
    layoutProvider?: BaseLayoutProvider;
    /** 项目布局回调 */
    onItemLayout?: (index: number) => void;
    /** 渲染项目容器函数 */
    renderItemContainer?: (props: object, parentProps: ViewRendererProps<T>, children?: React.ReactNode) => React.ReactNode;
}

/** 基础视图渲染器抽象类 */
export default abstract class BaseViewRenderer<T> extends ComponentCompat<ViewRendererProps<T>, {}> {
    /** 渲染器是否已挂载 */
    public isRendererMounted: boolean = true;
    /** 动画器样式覆盖对象 */
    protected animatorStyleOverrides: object | undefined;

    /** 
     * 组件是否应该更新
     * @param newProps 新的属性
     */
    public shouldComponentUpdate(newProps: ViewRendererProps<any>): boolean {
        const hasMoved = this.props.x !== newProps.x || this.props.y !== newProps.y;

        const hasSizeChanged = !newProps.forceNonDeterministicRendering &&
            (this.props.width !== newProps.width || this.props.height !== newProps.height) ||
            this.props.layoutProvider !== newProps.layoutProvider;

        const hasExtendedStateChanged = this.props.extendedState !== newProps.extendedState;
        const hasInternalSnapshotChanged = this.props.internalSnapshot !== newProps.internalSnapshot;
        const hasDataChanged = (this.props.dataHasChanged && this.props.dataHasChanged(this.props.data, newProps.data));
        let shouldUpdate = hasSizeChanged || hasDataChanged || hasExtendedStateChanged || hasInternalSnapshotChanged;
        if (shouldUpdate) {
            newProps.itemAnimator.animateWillUpdate(this.props.x, this.props.y, newProps.x, newProps.y, this.getRef() as object, newProps.index);
        } else if (hasMoved) {
            shouldUpdate = !newProps.itemAnimator.animateShift(this.props.x, this.props.y, newProps.x, newProps.y, this.getRef() as object, newProps.index);
        }
        return shouldUpdate;
    }

    /** 组件挂载完成时的生命周期方法 */
    public componentDidMount(): void {
        this.animatorStyleOverrides = undefined;
        this.props.itemAnimator.animateDidMount(this.props.x, this.props.y, this.getRef() as object, this.props.index);
    }

    /** 组件即将挂载时的生命周期方法 */
    public componentWillMountCompat(): void {
        this.animatorStyleOverrides = this.props.itemAnimator.animateWillMount(this.props.x, this.props.y, this.props.index);
    }

    /** 组件即将卸载时的生命周期方法 */
    public componentWillUnmount(): void {
        this.isRendererMounted = false;
        this.props.itemAnimator.animateWillUnmount(this.props.x, this.props.y, this.getRef() as object, this.props.index);
    }

    /** 组件更新完成时的生命周期方法 */
    public componentDidUpdate(): void {
        // no op
        // 无操作
    }

    /** 获取引用的抽象方法 */
    protected abstract getRef(): object | null;

    /** 渲染子项的方法 */
    protected renderChild(): JSX.Element | JSX.Element[] | null {
        return this.props.childRenderer(this.props.layoutType, this.props.data, this.props.index, this.props.extendedState);
    }
}
