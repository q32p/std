/**
 * @overview attachEventEmitable
 * @author Amir Absalyamov <mr.amirka@ya.ru>
 */

 import {
   Emitter,
 } from "./global";

/**
 * @description
 * Sets up a function that will be called whenever the specified event is delivered to the target.
 *
 * @example
 * ```js
 * const click$ = attachEventEmitable(element, 'click', false);
 * click$.on((e) => {
 *   // ...
 * });
 * ```
 */
 declare function attachEventEmitable(node: EventTarget, eventName: string, options?: any): Emitter<Event>;
 export = attachEventEmitable;
