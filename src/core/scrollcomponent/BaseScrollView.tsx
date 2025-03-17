/** 导入 React 核心库 */
import * as React from "react";
/** 导入 React 的 CSS 属性类型 */
import { CSSProperties } from "react";
/** 导入尺寸接口 */
import { Dimension } from "../dependencies/LayoutProvider";

/** 滚动视图默认属性接口定义 */
export interface ScrollViewDefaultProps {
    /** 滚动事件回调函数 */
    onScroll: (event: ScrollEvent) => void;
    /** 尺寸变化回调函数 */
    onSizeChanged: (dimensions: Dimension) => void;
    /** 是否水平滚动 */
    horizontal: boolean;
    /** 是否允许改变尺寸 */
    canChangeSize: boolean;
    /** 样式属性 */
    style?: CSSProperties | null;
    /** 是否使用窗口滚动 */
    useWindowScroll: boolean;
}

/** 滚动事件接口定义 */
export interface ScrollEvent {
    /** 原生事件对象 */
    nativeEvent: {
        /** 内容偏移量 */
        contentOffset: {
            /** 水平偏移量 */
            x: number,
            /** 垂直偏移量 */
            y: number,
        },
        /** 布局测量尺寸 */
        layoutMeasurement?: Dimension,
        /** 内容尺寸 */
        contentSize?: Dimension,
    };
}

/** 基础滚动视图抽象类 */
export default abstract class BaseScrollView extends React.Component<ScrollViewDefaultProps, {}> {
    /** 
     * 构造函数
     * @param props 组件属性
     */
    constructor(props: ScrollViewDefaultProps) {
        super(props);
    }

    /** 
     * 滚动到指定位置的抽象方法
     * @param scrollInput 滚动输入参数，包含目标位置和是否使用动画
     */
    public abstract scrollTo(scrollInput: { x: number, y: number, animated: boolean }): void;
}
