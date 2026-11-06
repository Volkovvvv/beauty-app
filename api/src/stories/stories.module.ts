import { Module } from '@nestjs/common'
import { StoriesController } from './stories.controller'
import { StoryStore } from './story-store'

@Module({ controllers: [StoriesController], providers: [StoryStore] })
export class StoriesModule {}
