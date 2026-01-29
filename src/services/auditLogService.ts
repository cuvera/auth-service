import { producer } from '../messaging/producers/producer';
import { logger } from '@cuvera/commons';

export interface AuditLogMetadata {
    tenantId: string;
    timestamp: string;
    version: string;
    source: string;
    sourceVersion: string;
    eventType: string;
    correlationId?: string;
    causationId?: string;
}

export interface AuditLogPayload {
    userId: string;
    username?: string;
    userEmail?: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    status: 'SUCCESS' | 'FAILURE';
    description: string;
    changes?: {
        oldValue: any;
        newValue: any;
    };
    metadata?: any;
}

export interface AuditLogMessage {
    metadata: AuditLogMetadata;
    payload: AuditLogPayload;
    headers?: {
        'content-type': string;
        'schema-version': string;
    };
}

class AuditLogService {
    private queueName: string;

    constructor() {
        this.queueName = process.env.MESSAGING_TOP_AUDIT_LOGS || 'dev.integration.activity.logs.v1';
    }

    /**
     * Sends an audit log message to RabbitMQ
     * @param message The audit log message object
     * @returns Promise<boolean> status of the send operation
     */
    async sendAuditLog(message: AuditLogMessage): Promise<boolean> {
        try {
            logger.info(`Publishing to RabbitMQ: ${JSON.stringify(message, null, 2)}`);

            const success = await producer.sendMessage(this.queueName, message);

            if (success) {
                logger.info(`[RabbitMQ] Payload sent to queue: ${this.queueName}`);
            } else {
                logger.error(`[RabbitMQ] Failed to send payload to queue: ${this.queueName}`);
            }

            return success;
        } catch (error) {
            logger.error(`Error sending audit log to queue: ${error}`);
            return false;
        }
    }

    /**
     * Helper to create a standardized audit log message
     */
    createMessage(tenantId: string, eventType: string, payload: AuditLogPayload): AuditLogMessage {
        return {
            metadata: {
                tenantId,
                timestamp: new Date().toISOString(),
                version: 'v1.0',
                source: 'auth-service',
                sourceVersion: '1.0.0',
                eventType,
                correlationId: '', // Can be populated if tracking is available
                causationId: '',
            },
            payload,
            headers: {
                'content-type': 'application/json',
                'schema-version': '1.0',
            },
        };
    }
}

export const auditLogService = new AuditLogService();
