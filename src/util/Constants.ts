export enum RedisTTLResponse {
	INVALID_KEY = -2,
	NO_EXPIRY   = -1
}

export enum YiffyErrorCodes {
	INTERNAL_ERROR                  = 0, // 500
	ACCESS_DENIED                   = 1, // 403
	READONLY                        = 2, // 503
	RATELIMIT_ROUTE                 = 1000, // 429
	RATELIMIT_GLOBAL                = 1001, // 429
	SUSPECTED_BROWSER_IMPERSONATION = 1002, // 403
	/** @deprecated unused */
	DOWN_FOR_MAINTENANCE            = 1003,

	INVALID_API_KEY      = 1010, // 401
	INACTIVE_API_KEY     = 1011, // 401
	DISABLED_API_KEY     = 1012, // 403
	API_KEY_REQUIRED     = 1013, // 401
	ANONYMOUS_RESTRICTED = 1014, // 403

	DISK_FULL             = 1020, // 507
	BLOCKED_USERAGENT     = 1021, // 403
	SERVICE_NO_ACCESS     = 1022, // 403
	UNKNOWN_ROUTE         = 1024, // 404
	METHOD_NOT_ALLOWED    = 1025, // 405

	// legacy codes that are spread out
	/** @deprecated unused */
	IMAGES_INVALID_RESPONSE_TYPE         = 1023,
	IMAGES_CATEGORY_NOT_FOUND            = 1030, // 404
	/** @deprecated unused */
	IMAGES_EMPTY_CATEGORY                = 1031,
	IMAGES_NOT_FOUND                     = 1040, // 404
	IMAGES_NO_RESULTS                    = 1041, // 400
	IMAGES_AMOUNT_LT_ONE                 = 1051, // 400
	IMAGES_AMOUNT_GT_FIVE                = 1052, // 400
	IMAGES_IMAGE_RESPONSE_DISABLED       = 1053, // 404
	BULK_IMAGES_INVALID_BODY             = 1054, // 400
	BULK_IMAGES_INVALID_CATEGORY         = 1055, // 400
	BULK_IMAGES_NUMBER_GT_MAX            = 1056, // 400
	IMAGES_SFW_ONLY_API_KEY              = 1057, // 403

	THUMBS_GENERIC_ERROR    = 1060, // 500
	/** @deprecated unused */
	THUMBS_API_KEY_REQUIRED = 1061,
	THUMBS_INVALID_POST_ID  = 1062, // 404
	THUMBS_INVALID_MD5      = 1063, // 404
	THUMBS_INVALID_TYPE     = 1064, // 404
	THUMBS_TIMEOUT          = 1065, // 408
	THUMBS_CHECK_NOT_FOUND  = 1066, // 404

	SHORTENER_CODE_TOO_LONG            = 1070, // 422
	SHORTENER_INVALID_CODE             = 1071, // 422
	SHORTENER_CODE_IN_USE              = 1072, // 409
	SHORTENER_INVALID_URL              = 1073, // 422
	SHORTENER_CREDIT_TOO_LONG          = 1074, // 422
	SHORTENER_NOT_FOUND                = 1075, // 404
	SHORTENER_MANAGEMENT_CODE_REQUIRED = 1076, // 401
	SHORTENER_NO_MANAGEMENT_CODE       = 1077, // 403
	SHORTENER_MANAGEMENT_CODE_MISMATCH = 1078, // 401
	SHORTENER_URL_IN_USE               = 1079, // 409
	SHORTENER_NO_CHANGES               = 1080, // 400
}
