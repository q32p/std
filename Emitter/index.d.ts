/**
 * @overview Emitter
 * @author Amir Absalyamov <mr.amirka@ya.ru>
 * @description
 * альтернатива rxjs
 */

import {
  Emitter,
  cancel,
} from "../global";



declare function emitterProvider<T>(
  initial?: EmitterExecutor<T> | T,
  defaultInitial?: T,
): Emitter<any>;
export = emitterProvider;
