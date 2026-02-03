import { generateKafkaMessage, logger } from "@cuvera/commons";
import { topics } from '../config/rabbitmq';
import { producer } from '../messaging/producers/producer';




export class MessageService {
    static async sendAuthLogsMessage(payload: any): Promise<boolean> {
        try {
            const topic = {
                eventType: topics.authLogs,
            };
            const message = generateKafkaMessage(payload, {
                tenantId: payload?.tenantId,
                eventType: topic?.eventType,
            });
            await producer.sendMessage(topics.authLogs, message);
            return true;
        } catch (error) {
            logger.error(`Warning: Failed to send message to RabbitMQ: ${error}`);
            return false;
        }
    }

    static async sendUserData(payload: any): Promise<boolean> {
        try {
            const topic = {
                eventType: topics.userData,
            };
            const message = generateKafkaMessage(payload, {
                tenantId: payload?.tenantId,
                eventType: topic?.eventType,
            });
            await producer.sendMessage(topics.userData, message);
            return true;
        } catch (error) {
            logger.error(`Warning: Failed to send message to RabbitMQ: ${error}`);
            return false;
        }
    }
}

