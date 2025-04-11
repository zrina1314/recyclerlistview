/** 项目动画器接口 */
export default interface ItemAnimator {
    //Web uses tranforms for moving items while react native uses left, top
    //IMPORTANT: In case of native itemRef will be a View and in web/RNW div element so, override accordingly.
    /**
     * Web 使用 transforms 来移动项目，而 react native 使用 left, top
     * 重要：在原生环境中 itemRef 将是一个 View，在 web/RNW 中是 div 元素，因此需要相应地重写
     */

    //Just an external trigger, no itemRef available, you can return initial style overrides here i.e, let's say if you want to
    //set initial opacity to 0 you can do: return { opacity: 0 };
    /**
     * 仅作为外部触发器，没有可用的 itemRef，你可以在这里返回初始样式覆盖
     * 例如，如果你想将初始透明度设置为 0，可以这样做：return { opacity: 0 };
     */
    animateWillMount: (atX: number, atY: number, itemIndex: number) => object | undefined;

    //Called after mount, item may already be visible when this is called. Handle accordingly
    /**
     * 在挂载后调用，调用时项目可能已经可见。需要相应处理
     */
    animateDidMount: (atX: number, atY: number, itemRef: object, itemIndex: number) => void;

    //Will be called if RLV cell is going to re-render, note that in case of non deterministic rendering width changes from layout
    //provider do not force re-render while they do so in deterministic. A re-render will apply the new layout which may cause a
    //jitter if you're in the middle of an animation. You need to handle those scenarios
    /**
     * 当 RLV 单元格将要重新渲染时调用，注意在非确定性渲染中，来自布局提供者的宽度变化不会强制重新渲染
     * 而在确定性渲染中会这样做。重新渲染将应用新的布局，如果你正在动画过程中，可能会导致抖动
     * 你需要处理这些场景
     */
    animateWillUpdate: (fromX: number, fromY: number, toX: number, toY: number, itemRef: object, itemIndex: number) => void;

    //If handled return true, RLV may appropriately skip the render cycle to avoid UI jitters. This callback indicates that there
    //is no update in the cell other than its position
    /**
     * 如果处理完成返回 true，RLV 可能会适当跳过渲染周期以避免 UI 抖动
     * 此回调表明除了位置之外，单元格没有其他更新
     */
    animateShift: (fromX: number, fromY: number, toX: number, toY: number, itemRef: object, itemIndex: number) => boolean;

    //Called before unmount
    /** 在卸载前调用 */
    animateWillUnmount: (atX: number, atY: number, itemRef: object, itemIndex: number) => void;
}

/** 基础项目动画器类 */
export class BaseItemAnimator implements ItemAnimator {
    /** 是否使用原生驱动 */
    public static USE_NATIVE_DRIVER = false;

    /**
     * 即将挂载时的动画处理
     * @param atX X坐标
     * @param atY Y坐标
     * @param itemIndex 项目索引
     */
    public animateWillMount(atX: number, atY: number, itemIndex: number): object | undefined {
        return undefined;
    }

    /**
     * 挂载完成时的动画处理
     * @param atX X坐标
     * @param atY Y坐标
     * @param itemRef 项目引用
     * @param itemIndex 项目索引
     */
    public animateDidMount(atX: number, atY: number, itemRef: object, itemIndex: number): void {
        //no need
        //无需处理
    }

    /**
     * 即将更新时的动画处理
     * @param fromX 起始X坐标
     * @param fromY 起始Y坐标
     * @param toX 目标X坐标
     * @param toY 目标Y坐标
     * @param itemRef 项目引用
     * @param itemIndex 项目索引
     */
    public animateWillUpdate(fromX: number, fromY: number, toX: number, toY: number, itemRef: object, itemIndex: number): void {
        //no need
        //无需处理
    }

    /**
     * 位置偏移动画处理
     * @param fromX 起始X坐标
     * @param fromY 起始Y坐标
     * @param toX 目标X坐标
     * @param toY 目标Y坐标
     * @param itemRef 项目引用
     * @param itemIndex 项目索引
     */
    public animateShift(fromX: number, fromY: number, toX: number, toY: number, itemRef: object, itemIndex: number): boolean {
        return false;
    }

    /**
     * 即将卸载时的动画处理
     * @param atX X坐标
     * @param atY Y坐标
     * @param itemRef 项目引用
     * @param itemIndex 项目索引
     */
    public animateWillUnmount(atX: number, atY: number, itemRef: object, itemIndex: number): void {
        //no need
        //无需处理
    }
}
