/** 导入 RecyclerListView 及其相关类型 */
import RecyclerListView, { RecyclerListViewProps, RecyclerListViewState } from "./RecyclerListView";

/** 渐进式列表视图属性接口 */
export interface ProgressiveListViewProps extends RecyclerListViewProps {
    /** 最大渲染提前量 */
    maxRenderAhead?: number;
    /** 渲染提前步进值 */
    renderAheadStep?: number;

    /**
     * A smaller final value can help in building up recycler pool in advance. This is only used if there is a valid updated cycle.
     * e.g, if maxRenderAhead is 0 then there will be no cycle and final value will be unused
     *
     * 较小的最终值可以帮助提前建立回收池。这仅在有有效的更新周期时使用。
     * 例如，如果 maxRenderAhead 为 0，则不会有周期，最终值将不会被使用
     */
    finalRenderAheadOffset?: number;
}

/**
 * This will incrementally update renderAhead distance and render the page progressively.
 * renderAheadOffset = initial value which will be incremented
 * renderAheadStep = amount of increment made on each frame
 * maxRenderAhead = maximum value for render ahead at the end of update cycle
 * finalRenderAheadOffset = value to set after whole update cycle is completed. If undefined, final offset value will be equal to maxRenderAhead
 *
 * 这将逐步更新渲染提前距离并渐进式地渲染页面。
 * renderAheadOffset = 将要递增的初始值
 * renderAheadStep = 每帧增加的数量
 * maxRenderAhead = 更新周期结束时的最大渲染提前值
 * finalRenderAheadOffset = 整个更新周期完成后要设置的值。如果未定义，最终偏移值将等于 maxRenderAhead
 */
export default class ProgressiveListView extends RecyclerListView<ProgressiveListViewProps, RecyclerListViewState> {
    /** 默认属性 */
    public static defaultProps = {
        ...RecyclerListView.defaultProps,
        maxRenderAhead: Number.MAX_VALUE,
        renderAheadStep: 300,
        renderAheadOffset: 0,
    };

    /** 渲染提前更新回调ID */
    private renderAheadUpdateCallbackId?: number;
    /** 是否完成首次布局 */
    private isFirstLayoutComplete: boolean = false;

    /** 组件挂载完成时的生命周期方法 */
    public componentDidMount(): void {
        super.componentDidMount();
        if (!this.props.forceNonDeterministicRendering) {
            this.updateRenderAheadProgressively(this.getCurrentRenderAheadOffset());
        }
    }

    /** 组件即将卸载时的生命周期方法 */
    public componentWillUnmount(): void {
        this.cancelRenderAheadUpdate();
        super.componentWillUnmount();
    }

    /**
     * 项目布局完成时的处理方法
     * @param index 项目索引
     */
    protected onItemLayout(index: number): void {
        if (!this.isFirstLayoutComplete) {
            this.isFirstLayoutComplete = true;
            if (this.props.forceNonDeterministicRendering) {
                this.updateRenderAheadProgressively(this.getCurrentRenderAheadOffset());
            }
        }
        super.onItemLayout(index);
    }

    /**
     * 渐进式更新渲染提前量
     * @param newVal 新的渲染提前值
     */
    private updateRenderAheadProgressively(newVal: number): void {
        this.cancelRenderAheadUpdate(); // Cancel any pending callback.
        this.renderAheadUpdateCallbackId = requestAnimationFrame(() => {
            if (!this.updateRenderAheadOffset(newVal)) {
                this.updateRenderAheadProgressively(newVal);
            } else {
                this.incrementRenderAhead();
            }
        });
    }

    /** 增加渲染提前量 */
    private incrementRenderAhead(): void {
        if (this.props.maxRenderAhead && this.props.renderAheadStep) {
            const layoutManager = this.getVirtualRenderer().getLayoutManager();
            const currentRenderAheadOffset = this.getCurrentRenderAheadOffset();
            if (layoutManager) {
                const contentDimension = layoutManager.getContentDimension();
                const maxContentSize = this.props.isHorizontal ? contentDimension.width : contentDimension.height;
                if (currentRenderAheadOffset < maxContentSize && currentRenderAheadOffset < this.props.maxRenderAhead) {
                    const newRenderAheadOffset = currentRenderAheadOffset + this.props.renderAheadStep;
                    this.updateRenderAheadProgressively(newRenderAheadOffset);
                } else {
                    this.performFinalUpdate();
                }
            }
        }
    }

    /** 执行最终更新 */
    private performFinalUpdate(): void {
        this.cancelRenderAheadUpdate(); // Cancel any pending callback.
        this.renderAheadUpdateCallbackId = requestAnimationFrame(() => {
            if (this.props.finalRenderAheadOffset !== undefined) {
                this.updateRenderAheadOffset(this.props.finalRenderAheadOffset);
            }
        });
    }

    /** 取消渲染提前更新 */
    private cancelRenderAheadUpdate(): void {
        if (this.renderAheadUpdateCallbackId !== undefined) {
            cancelAnimationFrame(this.renderAheadUpdateCallbackId);
        }
    }
}
