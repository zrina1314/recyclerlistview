import { Layout, LayoutManager } from "../layoutmanager/LayoutManager";
import { WrapGridLayoutManager } from "../layoutmanager/WrapGridLayoutManager";

/**
 * Created by talha.naqvi on 05/04/17.
 * You can create a new instance or inherit and override default methods
 * You may need access to data provider here, it might make sense to pass a function which lets you fetch the latest data provider
 * Why only indexes? The answer is to allow data virtualization in the future. Since layouts are accessed much before the actual render assuming having all
 * data upfront will only limit possibilites in the future.
 *
 * By design LayoutProvider forces you to think in terms of view types. What that means is that you'll always be dealing with a finite set of view templates
 * with deterministic dimensions. We want to eliminate unnecessary re-layouts that happen when height, by mistake, is not taken into consideration.
 * This patters ensures that your scrolling is as smooth as it gets. You can always increase the number of types to handle non deterministic scenarios.
 *
 * NOTE: You can also implement features such as ListView/GridView switch by simple changing your layout provider.
 */

/**
 * 布局提供者的基础抽象类
 * 负责管理列表项的布局类型和尺寸计算
 */
export abstract class BaseLayoutProvider {
    /**
     * 标识是否需要在应用新布局时保持第一个可见项的位置
     * 如果新的布局提供者不需要保持第一个可见索引，则设置为 false
     * //Unset if your new layout provider doesn't require firstVisibleIndex preservation on application
     */
    public shouldRefreshWithAnchoring: boolean = true;

    /** 最后使用的布局管理器实例 */
    private _lastLayoutManager?: LayoutManager;

    /**
     * 获取指定索引项的布局类型
     * @description Given an index a provider is expected to return a view type which used to recycling choices
     */
    public abstract getLayoutTypeForIndex(index: number): string | number;

    /**
     * 检查给定尺寸是否与布局提供者的期望尺寸不符
     * @description Check if given dimension contradicts with your layout provider, return true for mismatches. Returning true will
     * cause a relayout to fix the discrepancy
     * @param dimension 当前尺寸
     * @param type 布局类型
     * @param index 项目索引
     */
    public abstract checkDimensionDiscrepancy(dimension: Dimension, type: string | number, index: number): boolean;

    /**
     * 创建布局管理器
     * @param renderWindowSize 渲染窗口尺寸
     * @param isHorizontal 是否水平布局
     * @param cachedLayouts 缓存的布局
     */
    public createLayoutManager(renderWindowSize: Dimension, isHorizontal?: boolean, cachedLayouts?: Layout[]): LayoutManager {
        this._lastLayoutManager = this.newLayoutManager(renderWindowSize, isHorizontal, cachedLayouts);
        return this._lastLayoutManager;
    }

    /** 获取当前布局管理器实例 */
    public getLayoutManager(): LayoutManager | undefined {
        return this._lastLayoutManager;
    }

    /**
     * 创建新的布局管理器实例
     * 子类必须实现此方法以提供具体的布局管理策略
     * @description Return your layout manager, you get all required dependencies here. Also, make sure to use cachedLayouts.
     * RLV might cache layouts and give back to
     * in cases of context preservation. Make sure you use them if provided.
     * IMP: Output of this method should be cached in lastLayoutManager. It's not required to be cached, but it's good for internal optimization.
     */
    protected abstract newLayoutManager(renderWindowSize: Dimension, isHorizontal?: boolean, cachedLayouts?: Layout[]): LayoutManager;
}

/**
 * 具体的布局提供者实现类
 */
export class LayoutProvider extends BaseLayoutProvider {
    /** 获取布局类型的函数 */
    private _getLayoutTypeForIndex: (index: number) => string | number;
    /** 设置布局的函数 */
    private _setLayoutForType: (type: string | number, dim: Dimension, index: number) => void;
    /** 临时尺寸对象，用于计算比较 */
    private _tempDim: Dimension;

    /**
     * 构造函数
     * @param getLayoutTypeForIndex 获取布局类型的函数
     * @param setLayoutForType 设置布局的函数
     */
    constructor(getLayoutTypeForIndex: (index: number) => string | number, setLayoutForType: (type: string | number, dim: Dimension, index: number) => void) {
        super();
        this._getLayoutTypeForIndex = getLayoutTypeForIndex;
        this._setLayoutForType = setLayoutForType;
        this._tempDim = { height: 0, width: 0 };
    }

    /** 创建包装网格布局管理器 */
    public newLayoutManager(renderWindowSize: Dimension, isHorizontal?: boolean, cachedLayouts?: Layout[]): LayoutManager {
        return new WrapGridLayoutManager(this, renderWindowSize, isHorizontal, cachedLayouts);
    }

    /**
     * 获取指定索引的布局类型
     * //Provide a type for index, something which identifies the template of view about to load
     */
    public getLayoutTypeForIndex(index: number): string | number {
        return this._getLayoutTypeForIndex(index);
    }

    /**
     * 设置计算后的布局尺寸
     *
     * @param type 布局类型
     * @param dimension 尺寸对象
     * @param index 索引
     */
    //Given a type and dimension set the dimension values on given dimension object
    //You can also get index here if you add an extra argument but we don't recommend using it.
    public setComputedLayout(type: string | number, dimension: Dimension, index: number): void {
        return this._setLayoutForType(type, dimension, index);
    }

    /**
     * 检查尺寸是否有差异
     * @param dimension 当前尺寸
     * @param type 布局类型
     * @param index 索引
     */
    public checkDimensionDiscrepancy(dimension: Dimension, type: string | number, index: number): boolean {
        const dimension1 = dimension;
        this.setComputedLayout(type, this._tempDim, index);
        const dimension2 = this._tempDim;
        const layoutManager = this.getLayoutManager();
        if (layoutManager) {
            (layoutManager as WrapGridLayoutManager).setMaxBounds(dimension2);
        }
        return dimension1.height !== dimension2.height || dimension1.width !== dimension2.width;
    }
}

/** 尺寸接口定义 */
export interface Dimension {
    /** 高度 */
    height: number;
    /** 宽度 */
    width: number;
}
