/** 导入 React 核心库 */
import * as React from "react";
/** 导入 React Native 的滚动视图组件 */
import { ScrollView } from "react-native";
/** 导入尺寸接口 */
import { Dimension } from "../dependencies/LayoutProvider";
/** 导入基础滚动视图及其相关类型 */
import BaseScrollView, { ScrollEvent, ScrollViewDefaultProps } from "./BaseScrollView";

/** 滚动组件属性接口定义 */
export interface ScrollComponentProps {
    /** 尺寸变化回调函数 */
    onSizeChanged: (dimensions: Dimension) => void;
    /** 滚动事件回调函数 */
    onScroll: (offsetX: number, offsetY: number, rawEvent: ScrollEvent) => void;
    /** 内容高度 */
    contentHeight: number;
    /** 内容宽度 */
    contentWidth: number;
    /** 是否允许改变尺寸 */
    canChangeSize?: boolean;
    /** 外部滚动视图组件 */
    externalScrollView?: { new(props: ScrollViewDefaultProps): BaseScrollView };
    /** 是否水平滚动 */
    isHorizontal?: boolean;
    /** 渲染底部组件的函数 */
    renderFooter?: () => JSX.Element | JSX.Element[] | null;
    /** 滚动节流值 */
    scrollThrottle?: number;
    /** 是否使用窗口滚动 */
    useWindowScroll?: boolean;
    /** 布局事件回调 */
    onLayout?: any;
    /** 渲染内容容器的函数 */
    renderContentContainer?: (props?: object, children?: React.ReactNode) => React.ReactNode | null;
    /** 预渲染偏移量 */
    renderAheadOffset: number;
    /** 布局尺寸 */
    layoutSize?: Dimension;
}

/** 基础滚动组件抽象类 */
export default abstract class BaseScrollComponent extends React.Component<ScrollComponentProps, {}> {
    /** 
     * 滚动到指定位置的抽象方法
     * @param x 水平偏移量
     * @param y 垂直偏移量
     * @param animate 是否使用动画
     */
    public abstract scrollTo(x: number, y: number, animate: boolean): void;

    //Override and return node handle to your custom scrollview. Useful if you need to use Animated Events.
    //重写并返回自定义滚动视图的节点句柄。在需要使用动画事件时很有用。
    public getScrollableNode(): number | null {
        return null;
    }

    //Override and return ref to your custom scrollview. Useful if you need to use Animated Events on the new architecture.
    //重写并返回自定义滚动视图的引用。在新架构上使用动画事件时很有用。
    public getNativeScrollRef(): ScrollView | null {
        return null;
    }
}
