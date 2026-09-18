import { isVisualPlatform, type VisualPlatform } from '../entities/VisualClassification';
import { isVisualFlowType, type VisualFlowType } from '../entities/VisualFlowType';
import { productFlowInvalidArgs } from '../errors/productFlowError';

const FLOW_TITLE_MAX_LENGTH = 100;
const FLOW_DESCRIPTION_MAX_LENGTH = 2000;
const FLOW_CAPTION_MAX_LENGTH = 300;

export const FLOW_MIN_STEPS = 2;
export const FLOW_MAX_STEPS = 50;

export function normalizeFlowTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length < 1 || trimmed.length > FLOW_TITLE_MAX_LENGTH) {
    throw productFlowInvalidArgs('플로 제목은 1자 이상 100자 이하로 입력해 주세요.');
  }
  return trimmed;
}

export function normalizeFlowDescription(description: string): string {
  const trimmed = description.trim();
  if (trimmed.length > FLOW_DESCRIPTION_MAX_LENGTH) {
    throw productFlowInvalidArgs('플로 설명은 2000자 이하로 입력해 주세요.');
  }
  return trimmed;
}

export function normalizeFlowPlatform(platform: string): VisualPlatform {
  if (!isVisualPlatform(platform)) {
    throw productFlowInvalidArgs('지원하지 않는 플랫폼 값입니다.');
  }
  return platform;
}

export function normalizeFlowType(flowType: string): VisualFlowType {
  if (!isVisualFlowType(flowType)) {
    throw productFlowInvalidArgs('지원하지 않는 플로 유형 값입니다.');
  }
  return flowType;
}

export function normalizeFlowCaption(caption: string): string {
  const trimmed = caption.trim();
  if (trimmed.length > FLOW_CAPTION_MAX_LENGTH) {
    throw productFlowInvalidArgs('단계 설명은 300자 이하로 입력해 주세요.');
  }
  return trimmed;
}
