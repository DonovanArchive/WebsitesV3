type IsUnion<T, U extends T = T> =
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(T extends any ?
			(U extends T ? false : true)
			: never) extends false ? false : true;
export type ConvertFromRaw<T> = {
	[K in keyof T]: true extends IsUnion<T[K]> ? (0 | 1) extends T[K] ? boolean : T[K] : T[K];
};
