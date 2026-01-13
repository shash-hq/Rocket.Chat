/**
 * Symbol key used to store the attribute extractor on methods
 */
export const TRACE_EXTRACTOR_KEY = Symbol('traceExtractor');

/**
 * Type for the extractor function stored on decorated methods
 */
export type TraceExtractor<TArgs extends unknown[] = unknown[]> = (...args: TArgs) => Record<string, unknown>;

/**
 * Interface for methods that have a trace extractor attached
 */
export interface TracedMethod extends Function {
	[TRACE_EXTRACTOR_KEY]?: TraceExtractor;
}

/**
 * Decorator that attaches an attribute extractor to a method for tracing.
 * The extractor receives the method arguments and returns attributes to add to the span.
 *
 * Use this decorator on methods to define inline attribute extraction that
 * will be picked up by `traceInstanceMethods`.
 *
 * @param extractor - Function that extracts trace attributes from method arguments
 *
 * @example
 * class FederationMatrix {
 *   @traced((room: IRoom, owner: IUser) => ({
 *     roomId: room?._id,
 *     roomName: room?.name || room?.fname,
 *     ownerId: owner?._id,
 *   }))
 *   async createRoom(room: IRoom, owner: IUser) {
 *     // method implementation
 *   }
 * }
 */
export function traced<TArgs extends unknown[]>(extractor: (...args: TArgs) => Record<string, unknown>): MethodDecorator {
	return (_target, _propertyKey, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value as TracedMethod;
		if (originalMethod) {
			originalMethod[TRACE_EXTRACTOR_KEY] = extractor as TraceExtractor;
		}
		return descriptor;
	};
}

/**
 * Get the trace extractor from a method, if one was attached via @Traced decorator.
 *
 * @param method - The method function to check
 * @returns The extractor function if present, undefined otherwise
 */
export function getTraceExtractor(method: unknown): TraceExtractor | undefined {
	if (typeof method === 'function') {
		return (method as TracedMethod)[TRACE_EXTRACTOR_KEY];
	}
	return undefined;
}
