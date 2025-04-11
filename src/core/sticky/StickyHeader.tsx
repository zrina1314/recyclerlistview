/**
 * Created by ananya.chandra on 20/09/18.
 * 由 ananya.chandra 创建于 2018/09/20
 */

/** 导入粘性对象及其相关类型 */
import StickyObject, { StickyObjectProps, StickyType } from "./StickyObject";
/** 导入二分查找工具 */
import BinarySearch, { ValueAndIndex } from "../../utils/BinarySearch";
/** 导入窗口校正类型 */
import { WindowCorrection } from "../ViewabilityTracker";

/** 粘性头部组件类 */
export default class StickyHeader<P extends StickyObjectProps> extends StickyObject<P> {
    /** 构造函数 */
    constructor(props: P, context?: any) {
        super(props, context);
    }

    /**
     * 滚动事件处理方法
     * @param offsetY 垂直偏移量
     */
    public onScroll(offsetY: number): void {
        const startCorrection = this.getWindowCorrection(this.props).startCorrection;
        if (startCorrection) {
            this.containerPosition = { top: startCorrection };
            offsetY += startCorrection;
        }
        super.onScroll(offsetY);
    }

    /** 初始化粘性参数 */
    protected initStickyParams(): void {
        this.stickyType = StickyType.HEADER;
        this.stickyTypeMultiplier = 1;
        this.containerPosition = { top: this.getWindowCorrection(this.props).startCorrection };

        // Kept as true contrary to as in StickyFooter because in case of initialOffset not given, onScroll isn't called and boundaryProcessing isn't done.
        // Default behaviour in that case will be sticky header hidden.
        // 与 StickyFooter 相反，这里设置为 true，因为在没有给定初始偏移量的情况下，不会调用 onScroll 且不会进行边界处理。
        // 在这种情况下，默认行为是隐藏粘性头部。
        this.bounceScrolling = true;
    }

    /**
     * 计算可见的粘性索引
     * @param stickyIndices 粘性索引数组
     * @param smallestVisibleIndex 最小可见索引
     * @param largestVisibleIndex 最大可见索引
     * @param offsetY 垂直偏移量
     * @param windowBound 窗口边界
     */
    protected calculateVisibleStickyIndex(
        stickyIndices: number[] | undefined, smallestVisibleIndex: number, largestVisibleIndex: number, offsetY: number, windowBound?: number): void {
        if (stickyIndices && smallestVisibleIndex !== undefined) {
            this.bounceScrolling = this.hasReachedBoundary(offsetY, windowBound);
            if (smallestVisibleIndex < stickyIndices[0] || this.bounceScrolling) {
                this.stickyVisiblity = false;
            } else {
                this.stickyVisiblity = true;
                const valueAndIndex: ValueAndIndex | undefined = BinarySearch.findValueSmallerThanTarget(stickyIndices, smallestVisibleIndex);
                if (valueAndIndex) {
                    this.currentIndex = valueAndIndex.index;
                    this.currentStickyIndex = valueAndIndex.value;
                } else {
                    console.log("Header sticky index calculation gone wrong."); //tslint:disable-line
                }
            }
        }
    }

    /**
     * 获取下一个Y轴距离
     * @param nextY 下一个Y坐标
     * @param nextHeight 下一个高度
     */
    protected getNextYd(nextY: number, nextHeight: number): number {
        return nextY;
    }

    /**
     * 获取当前Y轴距离
     * @param currentY 当前Y坐标
     * @param currentHeight 当前高度
     */
    protected getCurrentYd(currentY: number, currentHeight: number): number {
        return currentY;
    }

    /**
     * 获取滚动Y轴位置
     * @param offsetY 垂直偏移量
     * @param scrollableHeight 可滚动高度
     */
    protected getScrollY(offsetY: number, scrollableHeight: number): number | undefined {
        return offsetY;
    }

    /**
     * 判断是否到达边界
     * @param offsetY 垂直偏移量
     * @param _windowBound 窗口边界
     */
    protected hasReachedBoundary(offsetY: number, _windowBound?: number): boolean {
        //TODO (Swapnil) Refer to talha and understand what needs to be done.
        //待办 (Swapnil) 参考 talha 并理解需要做什么。
        return false;
    }
}
