import 'reflect-metadata';

import './firebase';
import './storage';
import '@darun/backend/graphql-api';
import { CloudinaryImageRepositoryConfig } from '@darun/backend';
import { Container } from 'typedi';
import { RUNNING_ENV } from './environment';

Container.set(CloudinaryImageRepositoryConfig, new CloudinaryImageRepositoryConfig(RUNNING_ENV));
