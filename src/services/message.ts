import { generateKafkaMessage, logger, sendMessage } from "@cuvera/commons";
import { topics } from '../config/rabbitmq';
import { producer } from '../messaging/producers/producer';




export class MessageService {
    static async sendAuthLogsMessage(payload: any): Promise<boolean> {
        console.log('Sending message to Kafka:', payload);
        try {
            const topic = {
                eventType: topics.authLogs,
            };
            const message = generateKafkaMessage(payload, {
                tenantId: payload?.tenantId,
                eventType: topic?.eventType,
            });
            console.log('Sending message to Kafka:', message);
            await producer.sendMessage(topics.authLogs, message);
            return true;
            }catch (error) {
                console.error(`Error sending message to RabbitMQ: ${error}`);
                logger.error(`Warning: Failed to send message to RabbitMQ: ${error}`);
                return false;
            }
    }
}

