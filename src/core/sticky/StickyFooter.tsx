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

/** 粘性底部组件属性接口 */
export interface StickyFooterProps extends StickyObjectProps {
    /** 是否始终保持底部粘性 */
    alwaysStickyFooter?: boolean;
}

/** 粘性底部组件类 */
export default class StickyFooter<P extends StickyFooterProps> extends StickyObject<P> {
    /** 构造函数 */
    constructor(props: P, context?: any) {
        super(props, context);
    }

    /** 
     * 滚动事件处理方法
     * @param offsetY 垂直偏移量
     */
    public onScroll(offsetY: number): void {
        const endCorrection = this.getWindowCorrection(this.props).endCorrection;
        if (endCorrection) {
            this.containerPosition = { bottom: endCorrection };
            offsetY -= endCorrection;
        }
        super.onScroll(offsetY);
    }

    /** 初始化粘性参数 */
    protected initStickyParams(): void {
        this.stickyType = StickyType.FOOTER;
        this.stickyTypeMultiplier = -1;
        this.containerPosition = { bottom: this.getWindowCorrection(this.props).endCorrection };
        this.bounceScrolling = false;
    }

    /** 
     * 计算可见的粘性索引
     * @param stickyIndices 粘性索引数组
     * @param _smallestVisibleIndex 最小可见索引
     * @param largestVisibleIndex 最大可见索引
     * @param offsetY 垂直偏移量
     * @param windowBound 窗口边界
     */
    protected calculateVisibleStickyIndex(
        stickyIndices: number[] | undefined, _smallestVisibleIndex: number, largestVisibleIndex: number, offsetY: number, windowBound?: number): void {
        if (stickyIndices && largestVisibleIndex) {
            this.bounceScrolling = this.hasReachedBoundary(offsetY, windowBound);
            if (largestVisibleIndex > stickyIndices[stickyIndices.length - 1] || this.bounceScrolling) {
                this.stickyVisiblity = false;
                //This is needed only in when the window is non-scrollable.
                //这仅在窗口不可滚动时需要。
                if (this.props.alwaysStickyFooter && offsetY === 0) {
                    this.stickyVisiblity = true;
                }
            } else {
                this.stickyVisiblity = true;
                const valueAndIndex: ValueAndIndex | undefined = BinarySearch.findValueLargerThanTarget(stickyIndices, largestVisibleIndex);
                if (valueAndIndex) {
                    this.currentIndex = valueAndIndex.index;
                    this.currentStickyIndex = valueAndIndex.value;
                } else {
                    console.log("Footer sticky index calculation gone wrong."); //tslint:disable-line
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
        return -1 * (nextY + nextHeight);
    }

    /** 
     * 获取当前Y轴距离
     * @param currentY 当前Y坐标
     * @param currentHeight 当前高度
     */
    protected getCurrentYd(currentY: number, currentHeight: number): number {
        return -1 * (currentY + currentHeight);
    }

    /** 
     * 获取滚动Y轴位置
     * @param offsetY 垂直偏移量
     * @param scrollableHeight 可滚动高度
     */
    protected getScrollY(offsetY: number, scrollableHeight: number): number | undefined {
        return scrollableHeight ? -1 * (offsetY + scrollableHeight) : undefined;
    }

    /** 
     * 判断是否到达边界
     * @param offsetY 垂直偏移量
     * @param windowBound 窗口边界
     */
    protected hasReachedBoundary(offsetY: number, windowBound?: number): boolean {
        if (windowBound !== undefined) {
            const endReachedMargin = Math.round(offsetY - (windowBound));
            return endReachedMargin >= 0;
        }
        return false;
    }
}
