/** 导入异常接口定义 */
import { Exception } from "./CustomError";

/** RecyclerListView 异常集合对象 */
const RecyclerListViewExceptions: {[key: string]: Exception} = {
    /** 初始化异常：缺少必要的初始化参数 */
    initializationException: {
        message: "Parameters required for initializing the module are missing",
        type: "Initialization essentials missing",
    },
    /** 项目边界异常：项目尺寸未定义或为空 */
    itemBoundsException: {
        message: "Dimensions cannot be undefined or null, check if LayoutProvider returns irregular values",
        type: "ItemBoundsException",
    },
    /** 项目类型空异常：项目类型未定义 */
    itemTypeNullException: {
        message: "RecyclerListView items always require a type, check if LayoutProvider returns irregular values",
        type: "ItemTypeNullException",
    },
    /** 布局异常：组件尺寸未正确设置 */
    layoutException: {
        message: "RecyclerListView needs to have a bounded size. Currently height or, width is 0." +
                    "Consider adding style={{flex:1}} or, fixed dimensions",
        type: "LayoutException",
    },
    /** 平台检测异常：无法检测运行平台 */
    platformNotDetectedException: {
        message: "Unable to detect the running platform, if you're trying to run recyclerlistview " +
        "in browser make sure process.env.RLV_ENV is set to browser in webpack config",
        type: "PlatformNotDetectedException",
    },
    /** 未解决依赖异常：缺少数据源或布局提供者 */
    unresolvedDependenciesException: {
        message: "missing datasource or layout provider, cannot proceed without it",
        type: "UnresolvedDependenciesException",
    },
    /** ref 不是函数异常：使用 StickyContainer 时的引用格式错误 */
    refNotAsFunctionException: {
        message: "When using StickyContainer, RecyclerListView needs to use ref as a function and not as a string.",
        type: "RefNotAsFunctionException",
    },
    /** 错误的粘性子类型异常：StickyContainer 子组件类型错误 */
    wrongStickyChildTypeException: {
        message: "StickyContainer can only have a single child of type RecyclerListView.",
        type: "WrongStickyChildTypeException",
    },
    /** 使用已废弃的可见索引变化参数异常 */
    usingOldVisibleIndexesChangedParam: {
        message: "onVisibleIndexesChanged has been deprecated. Please use onVisibleIndicesChanged instead.",
        type: "usingOldVisibleIndexesChangedParam",
    },
    /** 粘性索引数组排序错误异常 */
    stickyIndicesArraySortError: {
        message: "The sticky indices array passed to StickyContainer isn't sorted in ascending order.",
        type: "stickyIndicesArraySortError",
    },
};

/** 导出异常集合 */
export default RecyclerListViewExceptions;
