import { LayoutProvider, Dimension } from "../dependencies/LayoutProvider";
import CustomError from "../exceptions/CustomError";
import { LayoutManager, Layout, Point } from "./LayoutManager";

/**
 * WrapGridLayoutManager 类继承自 LayoutManager，用于管理包装网格布局。
 * 该类处理布局的各种操作，如覆盖布局、设置最大边界、重新布局等。
 */
export class WrapGridLayoutManager extends LayoutManager {
    /**
     * 布局提供者，用于获取布局类型和计算布局。
     */
    private _layoutProvider: LayoutProvider;
    /**
     * 渲染窗口的尺寸。
     */
    private _window: Dimension;
    /**
     * 布局的总高度。
     */
    private _totalHeight: number;
    /**
     * 布局的总宽度。
     */
    private _totalWidth: number;
    /**
     * 布局方向是否为水平。
     */
    private _isHorizontal: boolean;
    /**
     * 存储布局信息的数组。
     */
    private _layouts: Layout[];

    /**
     * 构造函数，初始化 WrapGridLayoutManager 实例。
     * @param layoutProvider 布局提供者，用于获取布局类型和计算布局。
     * @param renderWindowSize 渲染窗口的尺寸。
     * @param isHorizontal 布局方向是否为水平，默认为 false。
     * @param cachedLayouts 可选的缓存布局数组。
     */
    constructor(layoutProvider: LayoutProvider, renderWindowSize: Dimension, isHorizontal: boolean = false, cachedLayouts?: Layout[]) {
        /** 调用父类的构造函数 */
        super();
        /** 初始化布局提供者 */
        this._layoutProvider = layoutProvider;
        /** 初始化渲染窗口尺寸 */
        this._window = renderWindowSize;
        /** 初始化总高度为 0 */
        this._totalHeight = 0;
        /** 初始化总宽度为 0 */
        this._totalWidth = 0;
        /** 确定布局方向 */
        this._isHorizontal = !!isHorizontal;
        /** 初始化布局数组，如果有缓存布局则使用，否则为空数组 */
        this._layouts = cachedLayouts ? cachedLayouts : [];
    }

    /**
     * 获取布局的内容尺寸。
     * @returns 包含高度和宽度的尺寸对象。
     */
    public getContentDimension(): Dimension {
        return { height: this._totalHeight, width: this._totalWidth };
    }

    /**
     * 当调用 removeLayout 时，会从布局数组中移除指定索引的布局。
     * 如果布局数组为空，会将总高度和总宽度重置为 0。
     * @param index 要移除的布局的索引。
     * when remove layout is called, it will remove the layout from the layouts array
     * and if the layouts array is empty, it will reset the total height and total width to 0
     * @param index
     */
    public removeLayout(index: number): void {
        // 调用父类的 removeLayout 方法
        super.removeLayout(index);
        // 检查布局数组是否为空
        if (this._layouts.length === 0) {
            // 若为空，将总高度重置为 0
            this._totalHeight = 0;
            // 若为空，将总宽度重置为 0
            this._totalWidth = 0;
        }
    }

    /**
     * 获取所有布局信息。
     * @returns 布局信息数组。
     */
    public getLayouts(): Layout[] {
        return this._layouts;
    }

    /**
     * 获取指定索引布局的偏移量。
     * @param index 布局的索引。
     * @returns 包含 x 和 y 坐标的点对象。
     * @throws 如果指定索引没有可用布局，抛出 CustomError 异常。
     */
    public getOffsetForIndex(index: number): Point {
        // 检查布局数组长度是否大于指定索引
        if (this._layouts.length > index) {
            // 若大于，返回该索引布局的偏移量
            return { x: this._layouts[index].x, y: this._layouts[index].y };
        } else {
            // 若不满足条件，抛出异常
            throw new CustomError({
                message: "No layout available for index: " + index,
                type: "LayoutUnavailableException",
            });
        }
    }

    /**
     * 覆盖指定索引的布局尺寸。
     * @param index 要覆盖布局的索引。
     * @param dim 新的尺寸。
     * @returns 若成功覆盖布局返回 true。
     */
    public overrideLayout(index: number, dim: Dimension): boolean {
        const layout = this._layouts[index];
        if (layout) {
            // 标记该布局已被覆盖
            layout.isOverridden = true;
            // 更新布局的宽度
            layout.width = dim.width;
            // 更新布局的高度
            layout.height = dim.height;
        }
        return true;
    }

    /**
     * 设置布局项的最大边界。
     * @param itemDim 布局项的尺寸对象。
     */
    public setMaxBounds(itemDim: Dimension): void {
        if (this._isHorizontal) {
            // 水平布局时，限制高度不超过窗口高度
            itemDim.height = Math.min(this._window.height, itemDim.height);
        } else {
            // 垂直布局时，限制宽度不超过窗口宽度
            itemDim.width = Math.min(this._window.width, itemDim.width);
        }
    }

    /**
     * 从指定索引开始重新布局。
     * @param startIndex 开始重新布局的索引。
     * @param itemCount 布局项的数量。
     * @todo 在未来版本中进行懒计算优化。
     */
    public relayoutFromIndex(startIndex: number, itemCount: number): void {
        // 定位第一个相邻的索引
        startIndex = this._locateFirstNeighbourIndex(startIndex);
        let startX = 0;
        let startY = 0;
        let maxBound = 0;

        const startVal = this._layouts[startIndex];

        if (startVal) {
            // 获取起始布局的 x 坐标
            startX = startVal.x;
            // 获取起始布局的 y 坐标
            startY = startVal.y;
            // 将起始布局的尺寸转换为矩形信息
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
                // 如果布局已被覆盖且类型匹配，使用旧布局的尺寸
                itemDim.height = oldLayout.height;
                itemDim.width = oldLayout.width;
            } else {
                // 否则，通过布局提供者计算布局尺寸
                this._layoutProvider.setComputedLayout(layoutType, itemDim, i);
            }
            // 设置布局项的最大边界
            this.setMaxBounds(itemDim);
            // 检查布局是否超出边界，若超出则调整起始位置
            while (!this._checkBounds(startX, startY, itemDim, this._isHorizontal)) {
                if (this._isHorizontal) {
                    startX += maxBound;
                    startY = 0;
                    // 更新总宽度
                    this._totalWidth += maxBound;
                } else {
                    startX = 0;
                    startY += maxBound;
                    // 更新总高度
                    this._totalHeight += maxBound;
                }
                maxBound = 0;
            }

            // 更新最大边界值
            maxBound = this._isHorizontal ? Math.max(maxBound, itemDim.width) : Math.max(maxBound, itemDim.height);

            // @todo 在未来版本中，提前创建数组可提高性能
            if (i > oldItemCount - 1) {
                // 如果索引超出旧布局数组长度，添加新的布局项
                this._layouts.push({ x: startX, y: startY, height: itemDim.height, width: itemDim.width, type: layoutType });
            } else {
                // 否则，更新现有布局项的信息
                itemRect = this._layouts[i];
                itemRect.x = startX;
                itemRect.y = startY;
                itemRect.type = layoutType;
                itemRect.width = itemDim.width;
                itemRect.height = itemDim.height;
            }

            if (this._isHorizontal) {
                // 水平布局时，更新 y 坐标
                startY += itemDim.height;
            } else {
                // 垂直布局时，更新 x 坐标
                startX += itemDim.width;
            }
        }
        if (oldItemCount > itemCount) {
            // 如果旧布局数量多于新布局数量，移除多余的布局项
            this._layouts.splice(itemCount, oldItemCount - itemCount);
        }
        // 设置最终的布局尺寸
        this._setFinalDimensions(maxBound);
    }

    /**
     * 根据布局项的坐标设置总宽度或总高度。
     * @param itemRect 布局项的矩形信息。
     */
    private _pointDimensionsToRect(itemRect: Layout): void {
        if (this._isHorizontal) {
            // 水平布局时，设置总宽度
            this._totalWidth = itemRect.x;
        } else {
            // 垂直布局时，设置总高度
            this._totalHeight = itemRect.y;
        }
    }

    /**
     * 设置布局的最终尺寸。
     * @param maxBound 最大边界值。
     */
    private _setFinalDimensions(maxBound: number): void {
        if (this._isHorizontal) {
            // 水平布局时，设置总高度为窗口高度，并更新总宽度
            this._totalHeight = this._window.height;
            this._totalWidth += maxBound;
        } else {
            // 垂直布局时，设置总宽度为窗口宽度，并更新总高度
            this._totalWidth = this._window.width;
            this._totalHeight += maxBound;
        }
        this.layoutListener?.onLayoutChange({ height: this._totalHeight, width: this._totalWidth });
    }

    /**
     * 定位第一个相邻的索引。
     * @param startIndex 起始索引。
     * @returns 第一个相邻的索引。
     */
    private _locateFirstNeighbourIndex(startIndex: number): number {
        if (startIndex === 0) {
            return 0;
        }
        let i = startIndex - 1;
        for (; i >= 0; i--) {
            if (this._isHorizontal) {
                // 水平布局时，找到 y 坐标为 0 的索引
                if (this._layouts[i].y === 0) {
                    break;
                }
            } else if (this._layouts[i].x === 0) {
                // 垂直布局时，找到 x 坐标为 0 的索引
                break;
            }
        }
        return i;
    }

    /**
     * 检查布局项是否超出边界。
     * @param itemX 布局项的 x 坐标。
     * @param itemY 布局项的 y 坐标。
     * @param itemDim 布局项的尺寸对象。
     * @param isHorizontal 是否为水平布局。
     * @returns 如果布局项未超出边界返回 true，否则返回 false。
     */
    private _checkBounds(itemX: number, itemY: number, itemDim: Dimension, isHorizontal: boolean): boolean {
        return isHorizontal ? (itemY + itemDim.height <= this._window.height + 0.9) : (itemX + itemDim.width <= this._window.width + 0.9);
    }
}
