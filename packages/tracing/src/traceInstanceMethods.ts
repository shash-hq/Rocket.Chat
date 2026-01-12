import { tracerActiveSpan } from '.';

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

	/**
	 * Per-method attribute extractors that pull relevant debugging info from arguments
	 * Key is the method name, value is a function that receives arguments and returns attributes
	 */
	attributeExtractors?: Record<string, (args: unknown[]) => Record<string, unknown>>;
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
 * // For services with custom extractors:
 * return traceInstanceMethods(this, {
 *   type: 'service',
 *   attributeExtractors: {
 *     sendMessage: (args) => ({
 *       messageId: args[0]?._id,
 *       roomId: args[1]?._id,
 *     }),
 *   },
 * });
 */
export function traceInstanceMethods<T extends object>(instance: T, options: ITraceInstanceMethodsOptions): T {
	const className = instance.constructor.name;

	const { type, ignoreMethods = [], attributeExtractors = {} } = options;

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

						// If there's a custom extractor for this method, use it
						if (attributeExtractors[prop]) {
							try {
								const extractedAttrs = attributeExtractors[prop](argumentsList);
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
