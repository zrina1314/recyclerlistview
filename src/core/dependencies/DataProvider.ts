import { ObjectUtil } from "ts-object-utils";

/***
 * You can create a new instance or inherit and override default methods
 * Allows access to data and size. Clone with rows creates a new data provider and let listview know where to calculate row layout from.
 */

/**
 * 数据提供者的基础抽象类
 * 可以创建新实例或继承并重写默认方法
 * 允许访问数据和大小。通过克隆行创建新的数据提供者，并让列表视图知道从哪里开始计算行布局
 */
export abstract class BaseDataProvider {
    /** 判断两行数据是否发生变化的函数 */
    public rowHasChanged: (r1: any, r2: any) => boolean;

    /** 
     * 获取稳定ID的函数（在JS上下文中确保稳定ID是字符串）
     * In JS context make sure stable id is a string
     */
    public getStableId: (index: number) => string;

    /** 开始处理的第一个索引 */
    private _firstIndexToProcess: number = 0;

    /** 数据总数 */
    private _size: number = 0;

    /** 数据数组 */
    private _data: any[] = [];

    /** 是否使用稳定ID */
    private _hasStableIds = false;

    /** 是否需要处理数据变化 */
    private _requiresDataChangeHandling = false;

    /**
     * 构造函数
     * @param rowHasChanged 判断行数据是否变化的函数
     * @param getStableId 获取稳定ID的函数（可选）
     */
    constructor(rowHasChanged: (r1: any, r2: any) => boolean, getStableId?: (index: number) => string) {
        this.rowHasChanged = rowHasChanged;
        if (getStableId) {
            this.getStableId = getStableId;
            this._hasStableIds = true;
        } else {
            this.getStableId = (index) => index.toString();
        }
    }

    /** 创建新实例的抽象方法 */
    public abstract newInstance(rowHasChanged: (r1: any, r2: any) => boolean, getStableId?: (index: number) => string): BaseDataProvider;

    /** 获取指定索引的数据 */
    public getDataForIndex(index: number): any {
        return this._data[index];
    }

    /** 获取所有数据 */
    public getAllData(): any[] {
        return this._data;
    }

    /** 获取数据总数 */
    public getSize(): number {
        return this._size;
    }

    /** 是否使用稳定ID */
    public hasStableIds(): boolean {
        return this._hasStableIds;
    }

    /** 是否需要处理数据变化 */
    public requiresDataChangeHandling(): boolean {
        return this._requiresDataChangeHandling;
    }

    /** 获取内部处理的第一个索引 */
    public getFirstIndexToProcessInternal(): number {
        return this._firstIndexToProcess;
    }

    /**
     * 使用新数据克隆数据提供者
     * 如果已知第一个发生变化的行，可以提前传入以避免循环
     * No need to override this one
     * If you already know the first row where rowHasChanged will be false pass it upfront to avoid loop
     * @param newData 新数据数组
     * @param firstModifiedIndex 第一个修改的索引（可选）
     */
    public cloneWithRows(newData: any[], firstModifiedIndex?: number): DataProvider {
        const dp = this.newInstance(this.rowHasChanged, this._hasStableIds ? this.getStableId : undefined);
        const newSize = newData.length;
        const iterCount = Math.min(this._size, newSize);
        if (ObjectUtil.isNullOrUndefined(firstModifiedIndex)) {
            let i = 0;
            for (i = 0; i < iterCount; i++) {
                if (this.rowHasChanged(this._data[i], newData[i])) {
                    break;
                }
            }
            dp._firstIndexToProcess = i;
        } else {
            dp._firstIndexToProcess = Math.max(Math.min(firstModifiedIndex, this._data.length), 0);
        }
        if (dp._firstIndexToProcess !== this._data.length) {
            dp._requiresDataChangeHandling = true;
        }
        dp._data = newData;
        dp._size = newSize;
        return dp;
    }
}

/**
 * 数据提供者具体实现类
 */
export default class DataProvider extends BaseDataProvider {
    /**
     * 创建新实例
     * @param rowHasChanged 判断行数据是否变化的函数
     * @param getStableId 获取稳定ID的函数（可选）
     */
    public newInstance(rowHasChanged: (r1: any, r2: any) => boolean, getStableId?: ((index: number) => string) | undefined): BaseDataProvider {
        return new DataProvider(rowHasChanged, getStableId);
    }
}
