#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KanjiSyncStack } from '../lib/kanji-sync-stack';

const app = new cdk.App();
new KanjiSyncStack(app, 'KanjiSyncStack', {
  env: { region: 'ap-northeast-1' },
});
