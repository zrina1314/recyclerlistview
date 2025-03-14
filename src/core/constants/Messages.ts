export const Messages = {
    /** 列表视图验证错误：缺少数据源或布局提供者 */ 
    ERROR_LISTVIEW_VALIDATION : "missing datasource or layout provider, cannot proceed without it",

    /** 滚动到指定索引的警告：在 RecyclerListView 完成测量之前调用 scrollTo */ 
    WARN_SCROLL_TO_INDEX: "scrollTo was called before RecyclerListView was measured, please wait for the mount to finish",

    /** 可见索引变化方法废弃提示：建议使用新的方法名 */ 
    VISIBLE_INDEXES_CHANGED_DEPRECATED: "onVisibleIndexesChanged deprecated. Please use onVisibleIndicesChanged instead.",

    /** 分页时的动画警告：提示开发者在分页时不建议使用布局动画 */ 
    ANIMATION_ON_PAGINATION: "Looks like you're trying to use RecyclerListView's layout animation render while doing pagination. " +
                             "This operation will be ignored to avoid creation of too many items due to developer error.",
};
