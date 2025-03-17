import { LayoutProvider, Dimension } from "./LayoutProvider";
import { Layout, LayoutManager } from "../layoutmanager/LayoutManager";
import { GridLayoutManager } from "../layoutmanager/GridLayoutManager";

/**
 * 网格布局提供者类
 * 继承自 LayoutProvider，用于处理网格样式的列表布局
 */
export class GridLayoutProvider extends LayoutProvider {
  /** 获取项目高度或宽度的函数 */
  private _getHeightOrWidth: (index: number) => number;
  /** 获取项目跨度的函数 */
  private _getSpan: (index: number) => number;
  /** 最大跨度值 */
  private _maxSpan: number;
  /** 渲染窗口尺寸 */
  private _renderWindowSize?: Dimension;
  /** 是否为水平布局 */
  private _isHorizontal?: boolean;
  /** 可接受的重新布局偏差值 */
  private _acceptableRelayoutDelta: number;

  /**
   * 构造函数
   * @param maxSpan 最大跨度值
   * @param getLayoutType 获取布局类型的函数
   * @param getSpan 获取跨度的函数
   * @param getHeightOrWidth 获取高度或宽度的函数（水平布局时返回宽度，垂直布局时返回高度）
   * @param acceptableRelayoutDelta 可接受的重新布局偏差值
   */
  constructor(
    maxSpan: number,
    getLayoutType: (index: number) => string | number,
    getSpan: (index: number) => number,
    // If horizonal return width while spans will be rowspans. Opposite holds true if not horizontal
    getHeightOrWidth: (index: number) => number,
    acceptableRelayoutDelta?: number,
  ) {
    super(
      getLayoutType,
      (type: string | number, dimension: Dimension, index: number) => {
        this.setLayout(dimension, index);
      },
    );
    this._getHeightOrWidth = getHeightOrWidth;
    this._getSpan = getSpan;
    this._maxSpan = maxSpan;
    this._acceptableRelayoutDelta = ((acceptableRelayoutDelta === undefined) || (acceptableRelayoutDelta === null)) ? 1 : acceptableRelayoutDelta;
  }

  /**
   * 创建新的布局管理器
   * @param renderWindowSize 渲染窗口尺寸
   * @param isHorizontal 是否为水平布局
   * @param cachedLayouts 缓存的布局数组
   */
  public newLayoutManager(renderWindowSize: Dimension, isHorizontal?: boolean, cachedLayouts?: Layout[]): LayoutManager {
    this._isHorizontal = isHorizontal;
    this._renderWindowSize = renderWindowSize;
    return new GridLayoutManager(this, renderWindowSize, this._getSpan, this._maxSpan, this._acceptableRelayoutDelta, this._isHorizontal, cachedLayouts);
  }

  /**
   * 设置项目的布局尺寸
   * @param dimension 要设置的尺寸对象
   * @param index 项目索引
   */
  private setLayout(dimension: Dimension, index: number): void {
    const maxSpan: number = this._maxSpan;
    const itemSpan: number = this._getSpan(index);
    if (itemSpan > maxSpan) {
      throw new Error("Item span for index " + index + " is more than the max span");
    }
    if (this._renderWindowSize) {
      if (this._isHorizontal) {
        dimension.width = this._getHeightOrWidth(index);
        dimension.height = (this._renderWindowSize.height / maxSpan) * itemSpan;

      } else {
        dimension.height = this._getHeightOrWidth(index);
        dimension.width = (this._renderWindowSize.width / maxSpan) * itemSpan;
      }
    } else {
      throw new Error("setLayout called before layoutmanager was created, cannot be handled");
    }
  }
}
