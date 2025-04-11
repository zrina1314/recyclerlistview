/***
 * Computes the positions and dimensions of items that will be rendered by the list. The output from this is utilized by viewability tracker to compute the
 * lists of visible/hidden item.
 * 计算列表将要渲染的项目的位置和尺寸。这些输出将被可视性追踪器用来计算可见/隐藏项目的列表。
 */
/** 导入布局提供者和尺寸接口 */
import { Dimension } from "../dependencies/LayoutProvider";
/** 导入自定义错误类 */
import CustomError from "../exceptions/CustomError";
import { LayoutListener } from "./LayoutListener";

/** 布局管理器抽象基类 */
export abstract class LayoutManager {
    /** 布局变动的监听器 */
    protected layoutListener: LayoutListener|undefined|null;

    /** 获取指定索引项的偏移位置 */
    public getOffsetForIndex(index: number): Point {
        const layouts = this.getLayouts();
        if (layouts.length > index) {
            return { x: layouts[index].x, y: layouts[index].y };
        } else {
            throw new CustomError({
                message: "No layout available for index: " + index,
                type: "LayoutUnavailableException",
            });
        }
    }

    /**
     * 你可以在某些情况下重写此方法来覆盖样式，例如，你想要强制设置宽度但不设置高度
     * @description You can ovveride this incase you want to override style in some cases e.g, say you want to enfore width but not height
     */
    public getStyleOverridesForIndex(index: number): object | undefined {
        return undefined;
    }

    /**
     * 移除指定索引处的项目
     * @description Removes item at the specified index
     */
    public removeLayout(index: number): void {
        const layouts = this.getLayouts();
        if (index < layouts.length) {
            layouts.splice(index, 1);
        }
        if (index === 0 && layouts.length > 0) {
            const firstLayout = layouts[0];
            firstLayout.x = 0;
            firstLayout.y = 0;
        }
    }

    /**
     * 返回列表内所有内容的总尺寸
     * @description Return the dimension of entire content inside the list
     */
    public abstract getContentDimension(): Dimension;

    /**
     * 返回所有计算好的布局数组，经常被调用，你应该返回缓存的数组，不要在这里计算
     * @description Return all computed layouts as an array, frequently called, you are expected to return a cached array. Don't compute here.
     */
    public abstract getLayouts(): Layout[];

    /**
     * 当实际渲染尺寸与非确定性渲染的预期不匹配时，RLV 将调用此方法
     * @description 你应该缓存这个值并优先使用它，而不是提供的估计值
     * 无需重新布局，RLV 会触发重新布局。你只应在调用 relayoutFromIndex 时重新布局
     * 布局管理器可以选择忽略覆盖请求，例如在网格布局中，给定列跨度计算的宽度变化可以被垂直布局忽略
     * @description RLV will call this method in case of mismatch with actual rendered dimensions in case of non deterministic rendering
     * You are expected to cache this value and prefer it over estimates provided
     * No need to relayout which RLV will trigger. You should only relayout when relayoutFromIndex is called.
     * Layout managers can choose to ignore the override requests like in case of grid layout where width changes
     * can be ignored for a vertical layout given it gets computed via the given column span.
     * @param index
     * @param dim
     */
    public abstract overrideLayout(index: number, dim: Dimension): boolean;

    /**
     * 从给定索引重新计算布局，计算量大的操作应该在这里进行
     * @description Recompute layouts from given index, compute heavy stuff should be here
     */
    public abstract relayoutFromIndex(startIndex: number, itemCount: number): void;

    public  setLayoutListener(listener: LayoutListener|null): void {
        this.layoutListener = listener;
    }
}

/**
 * 布局接口，继承自 Dimension 和 Point 接口，包含布局的尺寸、坐标、是否覆盖和类型信息。
 */
export interface Layout extends Dimension, Point {
    isOverridden?: boolean;
    type: string | number;
}

/**
 * 点接口，包含 x 和 y 坐标。
 */
export interface Point {
    x: number;
    y: number;
}
