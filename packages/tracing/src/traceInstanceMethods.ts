import { tracerActiveSpan } from '.';
import { getTraceExtractor } from './tracedDecorator';

const getArguments = (args: unknown[]): unknown[] => {
	return args.map((arg) => {
		if (typeof arg === 'object' && arg != null && 'session' in arg) {
			return '[mongo options with session]';
		}
		return arg;
	});
};

/**
 * Options for tracing instance methods
 */
export interface ITraceInstanceMethodsOptions {
	/**
	 * The type prefix for span names (e.g., 'model', 'service', 'handler')
	 */
	type: string;

	/**
	 * Array of method names to exclude from tracing
	 */
	ignoreMethods?: string[];
}

/**
 * Wraps all methods of an instance with OpenTelemetry tracing spans.
 *
 * @param instance - The object instance to trace
 * @param options - Configuration options for tracing
 * @returns A proxied instance with all methods traced
 *
 * @example
 * // For models:
 * return traceInstanceMethods(this, { type: 'model' });
 *
 * @example
 * // For services with @traced decorators on methods:
 * class MyService {
 *   constructor() {
 *     return traceInstanceMethods(this, { type: 'service' });
 *   }
 *
 *   @traced((room: IRoom, owner: IUser) => ({
 *     roomId: room?._id,
 *     ownerId: owner?._id,
 *   }))
 *   async createRoom(room: IRoom, owner: IUser) { ... }
 * }
 */
export function traceInstanceMethods<T extends object>(instance: T, options: ITraceInstanceMethodsOptions): T {
	const className = instance.constructor.name;

	const { type, ignoreMethods = [] } = options;

	return new Proxy(instance, {
		get(target: Record<string, any>, prop: string): any {
			if (typeof target[prop] === 'function' && !ignoreMethods.includes(prop)) {
				return new Proxy(target[prop], {
					apply: (target, thisArg, argumentsList): any => {
						if (['doNotMixInclusionAndExclusionFields', 'ensureDefaultFields'].includes(prop)) {
							return Reflect.apply(target, thisArg, argumentsList);
						}

						// Build attributes: start with base info
						const attributes: Record<string, unknown> = {
							[type]: className,
							method: prop,
						};

						// Check for @traced decorator extractor
						const extractor = getTraceExtractor(target);

						if (extractor) {
							try {
								const extractedAttrs = extractor(...(argumentsList as unknown[]));
								Object.assign(attributes, extractedAttrs);
							} catch {
								// If extractor fails, continue with base attributes
							}
						} else {
							// Fallback to raw parameters for methods without extractors
							attributes.parameters = getArguments(argumentsList);
						}

						return tracerActiveSpan(
							`${type} ${className}.${prop}`,
							{ attributes: attributes as Record<string, string | number | boolean | undefined> },
							() => {
								return Reflect.apply(target, thisArg, argumentsList);
							},
						);
					},
				});
			}

			return Reflect.get(target, prop);
		},
	}) as T;
}
