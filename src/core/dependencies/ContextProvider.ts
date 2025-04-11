/**
 * 上下文提供者抽象类
 * 用于在视图被销毁和重建时保持滚动位置等状态
 * 特别适用于 Android 返回导航等场景，当前一个 Fragment 的 onDestroyView 已被调用时
 * 由于 RecyclerListView 只渲染可见项，可以立即跳转到任何位置
 * Context provider is useful in cases where your view gets destroyed and you want to maintain scroll position when recyclerlistview is recreated e.g,
 * back navigation in android when previous fragments onDestroyView has already been called. Since recyclerlistview only renders visible items you
 * can instantly jump to any location.
 *
 * Use this interface and implement the given methods to preserve context.
 */
export default abstract class ContextProvider {
    /**
     * 获取唯一键
     * 应返回字符串类型，在应用程序全局范围内必须唯一
     * Should be of string type, anything which is unique in global scope of your application
     */
    public abstract getUniqueKey(): string;

    /**
     * 保存值
     * 让 RecyclerListView 保存一个值，可以使用 sessionStorage/asyncStorage 等存储 API
     * @description Let recycler view save a value, you can use apis like session storage/async storage here
     * @param key 键名
     * @param value 要保存的值（字符串或数字）
     */
    public abstract save(key: string, value: string | number): void;

    /**
     * 获取值
     * 根据键名获取对应的值
     *
     * Get value for a key
     * @param key 键名
     * @returns 存储的值（字符串或数字）
     */
    public abstract get(key: string): string | number;

    /**
     * 移除键值对
     * Remove key value pair
     * @param key 要移除的键名
     */
    public abstract remove(key: string): void;
}
