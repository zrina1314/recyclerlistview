/***
 * Computes the positions and dimensions of items that will be rendered by the list. The output from this is utilized by viewability tracker to compute the
 * lists of visible/hidden item.
 * 计算列表将要渲染的项目的位置和尺寸。这些输出将被可视性追踪器用来计算可见/隐藏项目的列表。
 */
/** 导入布局提供者和尺寸接口 */
import { Dimension, LayoutProvider } from "../dependencies/LayoutProvider";
/** 导入自定义错误类 */
import CustomError from "../exceptions/CustomError";

/** 布局管理器抽象基类 */
export abstract class LayoutManager {
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

    //You can ovveride this incase you want to override style in some cases e.g, say you want to enfore width but not height
    //你可以在某些情况下重写此方法来覆盖样式，例如，你想要强制设置宽度但不设置高度
    public getStyleOverridesForIndex(index: number): object | undefined {
        return undefined;
    }

    //Removes item at the specified index
    //移除指定索引处的项目
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

    //Return the dimension of entire content inside the list
    //返回列表内所有内容的总尺寸
    public abstract getContentDimension(): Dimension;

    //Return all computed layouts as an array, frequently called, you are expected to return a cached array. Don't compute here.
    //返回所有计算好的布局数组，经常被调用，你应该返回缓存的数组，不要在这里计算
    public abstract getLayouts(): Layout[];

    //RLV will call this method in case of mismatch with actual rendered dimensions in case of non deterministic rendering
    //You are expected to cache this value and prefer it over estimates provided
    //No need to relayout which RLV will trigger. You should only relayout when relayoutFromIndex is called.
    //Layout managers can choose to ignore the override requests like in case of grid layout where width changes
    //can be ignored for a vertical layout given it gets computed via the given column span.
    //当实际渲染尺寸与非确定性渲染的预期不匹配时，RLV 将调用此方法
    //你应该缓存这个值并优先使用它，而不是提供的估计值
    //无需重新布局，RLV 会触发重新布局。你只应在调用 relayoutFromIndex 时重新布局
    //布局管理器可以选择忽略覆盖请求，例如在网格布局中，给定列跨度计算的宽度变化可以被垂直布局忽略
    public abstract overrideLayout(index: number, dim: Dimension): boolean;

    //Recompute layouts from given index, compute heavy stuff should be here
    //从给定索引重新计算布局，计算量大的操作应该在这里进行
    public abstract relayoutFromIndex(startIndex: number, itemCount: number): void;
}

export class WrapGridLayoutManager extends LayoutManager {
    private _layoutProvider: LayoutProvider;
    private _window: Dimension;
    private _totalHeight: number;
    private _totalWidth: number;
    private _isHorizontal: boolean;
    private _layouts: Layout[];

    constructor(layoutProvider: LayoutProvider, renderWindowSize: Dimension, isHorizontal: boolean = false, cachedLayouts?: Layout[]) {
        super();
        this._layoutProvider = layoutProvider;
        this._window = renderWindowSize;
        this._totalHeight = 0;
        this._totalWidth = 0;
        this._isHorizontal = !!isHorizontal;
        this._layouts = cachedLayouts ? cachedLayouts : [];
    }

    public getContentDimension(): Dimension {
        return { height: this._totalHeight, width: this._totalWidth };
    }
    /**
     * when remove layout is called, it will remove the layout from the layouts array
     * and if the layouts array is empty, it will reset the total height and total width to 0
     * @param index
     */
     public removeLayout(index: number): void {
        super.removeLayout(index);
        if (this._layouts.length === 0) {
            this._totalHeight = 0;
            this._totalWidth = 0;
        }
    }

    public getLayouts(): Layout[] {
        return this._layouts;
    }

    public getOffsetForIndex(index: number): Point {
        if (this._layouts.length > index) {
            return { x: this._layouts[index].x, y: this._layouts[index].y };
        } else {
            throw new CustomError({
                message: "No layout available for index: " + index,
                type: "LayoutUnavailableException",
            });
        }
    }

    public overrideLayout(index: number, dim: Dimension): boolean {
        const layout = this._layouts[index];
        if (layout) {
            layout.isOverridden = true;
            layout.width = dim.width;
            layout.height = dim.height;
        }
        return true;
    }

    public setMaxBounds(itemDim: Dimension): void {
        if (this._isHorizontal) {
            itemDim.height = Math.min(this._window.height, itemDim.height);
        } else {
            itemDim.width = Math.min(this._window.width, itemDim.width);
        }
    }

    //TODO:Talha laziliy calculate in future revisions
    public relayoutFromIndex(startIndex: number, itemCount: number): void {
        startIndex = this._locateFirstNeighbourIndex(startIndex);
        let startX = 0;
        let startY = 0;
        let maxBound = 0;

        const startVal = this._layouts[startIndex];

        if (startVal) {
            startX = startVal.x;
            startY = startVal.y;
            this._pointDimensionsToRect(startVal);
        }

        const oldItemCount = this._layouts.length;
        const itemDim = { height: 0, width: 0 };
        let itemRect = null;

        let oldLayout = null;

        for (let i = startIndex; i < itemCount; i++) {
            oldLayout = this._layouts[i];
            const layoutType = this._layoutProvider.getLayoutTypeForIndex(i);
            if (oldLayout && oldLayout.isOverridden && oldLayout.type === layoutType) {
                itemDim.height = oldLayout.height;
                itemDim.width = oldLayout.width;
            } else {
                this._layoutProvider.setComputedLayout(layoutType, itemDim, i);
            }
            this.setMaxBounds(itemDim);
            while (!this._checkBounds(startX, startY, itemDim, this._isHorizontal)) {
                if (this._isHorizontal) {
                    startX += maxBound;
                    startY = 0;
                    this._totalWidth += maxBound;
                } else {
                    startX = 0;
                    startY += maxBound;
                    this._totalHeight += maxBound;
                }
                maxBound = 0;
            }

            maxBound = this._isHorizontal ? Math.max(maxBound, itemDim.width) : Math.max(maxBound, itemDim.height);

            //TODO: Talha creating array upfront will speed this up
            if (i > oldItemCount - 1) {
                this._layouts.push({ x: startX, y: startY, height: itemDim.height, width: itemDim.width, type: layoutType });
            } else {
                itemRect = this._layouts[i];
                itemRect.x = startX;
                itemRect.y = startY;
                itemRect.type = layoutType;
                itemRect.width = itemDim.width;
                itemRect.height = itemDim.height;
            }

            if (this._isHorizontal) {
                startY += itemDim.height;
            } else {
                startX += itemDim.width;
            }
        }
        if (oldItemCount > itemCount) {
            this._layouts.splice(itemCount, oldItemCount - itemCount);
        }
        this._setFinalDimensions(maxBound);
    }

    private _pointDimensionsToRect(itemRect: Layout): void {
        if (this._isHorizontal) {
            this._totalWidth = itemRect.x;
        } else {
            this._totalHeight = itemRect.y;
        }
    }

    private _setFinalDimensions(maxBound: number): void {
        if (this._isHorizontal) {
            this._totalHeight = this._window.height;
            this._totalWidth += maxBound;
        } else {
            this._totalWidth = this._window.width;
            this._totalHeight += maxBound;
        }
    }

    private _locateFirstNeighbourIndex(startIndex: number): number {
        if (startIndex === 0) {
            return 0;
        }
        let i = startIndex - 1;
        for (; i >= 0; i--) {
            if (this._isHorizontal) {
                if (this._layouts[i].y === 0) {
                    break;
                }
            } else if (this._layouts[i].x === 0) {
                break;
            }
        }
        return i;
    }

    private _checkBounds(itemX: number, itemY: number, itemDim: Dimension, isHorizontal: boolean): boolean {
        return isHorizontal ? (itemY + itemDim.height <= this._window.height + 0.9) : (itemX + itemDim.width <= this._window.width + 0.9);
    }
}

export interface Layout extends Dimension, Point {
    isOverridden?: boolean;
    type: string | number;
}
export interface Point {
    x: number;
    y: number;
}
