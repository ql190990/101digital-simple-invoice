"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    logger = new common_1.Logger(AllExceptionsFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const { statusCode, message, error } = this.resolve(exception);
        if (statusCode >= common_1.HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(`[${request.correlationId ?? '-'}] ${request.method} ${request.url} → ${statusCode}: ${Array.isArray(message) ? message.join('; ') : message}`, exception instanceof Error ? exception.stack : undefined);
        }
        response.status(statusCode).json({ statusCode, message, error });
    }
    resolve(exception) {
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const res = exception.getResponse();
            if (typeof res === 'string') {
                return { statusCode: status, message: res, error: exception.name };
            }
            const body = res;
            return {
                statusCode: status,
                message: body.message ?? exception.message,
                error: body.error ?? this.reasonPhrase(status),
            };
        }
        if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            return this.resolvePrisma(exception);
        }
        return {
            statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
            error: 'Internal Server Error',
        };
    }
    resolvePrisma(exception) {
        if (exception.code === 'P2002') {
            return {
                statusCode: common_1.HttpStatus.CONFLICT,
                message: 'A record with the same unique value already exists',
                error: 'Conflict',
            };
        }
        if (exception.code === 'P2025') {
            return {
                statusCode: common_1.HttpStatus.NOT_FOUND,
                message: 'Record not found',
                error: 'Not Found',
            };
        }
        return {
            statusCode: common_1.HttpStatus.BAD_REQUEST,
            message: 'Database request error',
            error: 'Bad Request',
        };
    }
    reasonPhrase(status) {
        const map = {
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            409: 'Conflict',
            422: 'Unprocessable Entity',
            429: 'Too Many Requests',
            500: 'Internal Server Error',
        };
        return map[status] ?? 'Error';
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map