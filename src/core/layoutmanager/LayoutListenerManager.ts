import { Dimension } from "../dependencies/LayoutProvider";

/** 布局监听器 */
export interface LayoutListener {
    onLayoutChange(size:Dimension): void;
}




// class LayoutListenerManager {
//     private listeners: LayoutListener[] = [];
//     public addListener(listener: LayoutListener): void {
//         this.listeners.push(listener);
//     }
//     public removeListener(listener: LayoutListener): void {
//         const index = this.listeners.indexOf(listener);
//         if (index > -1) {
//             this.listeners.splice(index, 1);
//         }
//     }

//     public notifyLayoutChange(): void {
//         this.listeners.forEach(listener => listener.onLayoutChange());
//     }
// }

// export const layoutListenerManager = new LayoutListenerManager();