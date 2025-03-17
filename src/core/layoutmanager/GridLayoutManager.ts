/** 导入布局提供者 */
import { LayoutProvider } from "./../dependencies/LayoutProvider";
/** 导入网格布局管理器基类和布局接口 */
import { WrapGridLayoutManager, Layout } from "./LayoutManager";
/** 导入尺寸接口 */
import { Dimension } from "../dependencies/LayoutProvider";

/** 网格布局管理器类 */
export class GridLayoutManager extends WrapGridLayoutManager {
    /** 最大跨度值 */
    private _maxSpan: number;
    /** 获取项目跨度的函数 */
    private _getSpan: (index: number) => number;
    /** 网格是否水平布局 */
    private _isGridHorizontal: boolean | undefined;
    /** 渲染窗口尺寸 */
    private _renderWindowSize: Dimension;
    /** 可接受的重新布局偏差值 */
    private _acceptableRelayoutDelta: number;

    /**
     * 构造函数
     * @param layoutProvider 布局提供者
     * @param renderWindowSize 渲染窗口尺寸
     * @param getSpan 获取跨度的函数
     * @param maxSpan 最大跨度
     * @param acceptableRelayoutDelta 可接受的重新布局偏差值
     * @param isHorizontal 是否水平布局
     * @param cachedLayouts 缓存的布局
     */
    constructor(
      layoutProvider: LayoutProvider,
      renderWindowSize: Dimension,
      getSpan: (index: number) => number,
      maxSpan: number,
      acceptableRelayoutDelta: number,
      isHorizontal?: boolean,
      cachedLayouts?: Layout[],
    ) {
      /** 调用父类构造函数 */
      super(layoutProvider, renderWindowSize, isHorizontal, cachedLayouts);
      this._getSpan = getSpan;
      this._isGridHorizontal = isHorizontal;
      this._renderWindowSize = renderWindowSize;
      /** 验证重新布局偏差值 */
      if (acceptableRelayoutDelta < 0) {
        throw new Error("acceptableRelayoutDelta cannot be less than 0");
      } else {
        this._acceptableRelayoutDelta = acceptableRelayoutDelta;
      }
      /** 验证最大跨度值 */
      if (maxSpan <= 0) {
        throw new Error("Max Column Span cannot be less than or equal to 0");
      } else {
        this._maxSpan = maxSpan;
      }
    }

    /**
     * 重写布局方法
     * @param index 项目索引
     * @param dim 尺寸对象
     */
    public overrideLayout(index: number, dim: Dimension): boolean {
      // we are doing this because - when we provide decimal dimensions for a
      // certain cell - the onlayout returns a different dimension in certain high end devices.
      // This causes the layouting to behave weirdly as the new dimension might not adhere to the spans and the cells arrange themselves differently
      // So, whenever we have layouts for a certain index, we explicitly override the dimension to those very layout values
      // and call super so as to set the overridden flag as true
      /** 获取已存在的布局 */
      const layout = this.getLayouts()[index];
      /** 计算高度和宽度差异 */
      const heightDiff = Math.abs(dim.height - layout.height);
      const widthDiff = Math.abs(dim.width - layout.width);
      if (layout) {
        if (this._isGridHorizontal) {
          if (heightDiff < this._acceptableRelayoutDelta) {
            if (widthDiff === 0) {
              return false;
            }
            dim.height = layout.height;
          }
        } else {
          if (widthDiff < this._acceptableRelayoutDelta) {
            if (heightDiff === 0) {
              return false;
            }
            dim.width = layout.width;
          }
        }
      }
      return super.overrideLayout(index, dim);
    }

    /**
     * 获取指定索引的样式覆盖对象
     * @param index 项目索引
     */
    public getStyleOverridesForIndex(index: number): object | undefined {
      /** 获取当前索引的列跨度 */
      const columnSpanForIndex = this._getSpan(index);
      /** 根据布局方向返回相应的样式对象 */
      return this._isGridHorizontal
        ? {
          height:
            (this._renderWindowSize.height / this._maxSpan) * columnSpanForIndex,
        }
        : {
          width:
            (this._renderWindowSize.width / this._maxSpan) * columnSpanForIndex,
        };
    }
  }
