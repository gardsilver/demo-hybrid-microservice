import { Injectable } from '@nestjs/common';
import { KafkaHeadersBuilder } from 'src/modules/kafka/kafka-common';
import { IKafkaHeadersRequestBuilder } from '../types/types';

@Injectable()
export class KafkaHeadersRequestBuilder extends KafkaHeadersBuilder implements IKafkaHeadersRequestBuilder {}
