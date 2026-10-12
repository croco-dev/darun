import { Token } from 'typedi';
import type { TranslationJobEntity, TranslationJobStatus } from '../entities/TranslationJobEntity';

export const TranslationJobRepositoryToken = new Token<TranslationJobRepository>('TranslationJobRepository');

export interface TranslationJobRepository {
  createJob(job: {
    entityType: string;
    entityId: string;
    locale?: string;
    status?: TranslationJobStatus;
    message?: string;
    sourceHash?: string | null;
    model?: string | null;
    promptVersion?: string | null;
  }): Promise<TranslationJobEntity>;

  findJobById(id: string): Promise<TranslationJobEntity | null>;

  updateJobStatus(
    id: string,
    status: TranslationJobStatus,
    options?: {
      message?: string | null;
      error?: string | null;
      sourceHash?: string | null;
      model?: string | null;
      promptVersion?: string | null;
    }
  ): Promise<TranslationJobEntity>;

  /**
   * 조건부 상태 전이. 현재 상태가 expectedStatuses 중 하나일 때만 nextStatus로
   * 전이하고 전이된 작업을 반환한다. 조건 불일치 시 null을 반환한다.
   * 동시 중복 실행 중 선점 경쟁을 해소하는 데 사용한다.
   */
  claimJobStatus(
    id: string,
    expectedStatuses: TranslationJobStatus[],
    nextStatus: TranslationJobStatus,
    options?: {
      message?: string | null;
      error?: string | null;
      sourceHash?: string | null;
      model?: string | null;
      promptVersion?: string | null;
    }
  ): Promise<TranslationJobEntity | null>;

  /**
   * lease 소유권 기반 클레임. pending은 즉시 선점하고, in_progress는
   * lease 만료 시에만 재선점한다. leaseToken이 새 소유권을 식별한다.
   */
  claimJobLease?(input: {
    jobId: string;
    leaseToken: string;
    leaseUntil: Date;
  }): Promise<TranslationJobEntity | null>;

  /**
   * lease 소유권 기반 확정 쓰기. 현재 행의 leaseToken이 입력과 일치하고
   * 상태가 in_progress일 때만 nextStatus로 전이하고 전이된 작업을 반환한다.
   * 구 attempt의 늦은 쓰기와 이미 끝난 terminal 행 덮어쓰기는 null로 거부된다(fence).
   */
  completeJobLease?(
    jobId: string,
    leaseToken: string,
    nextStatus: Extract<TranslationJobStatus, 'completed' | 'failed' | 'superseded'>,
    options?: {
      message?: string | null;
      error?: string | null;
      sourceHash?: string | null;
      model?: string | null;
      promptVersion?: string | null;
    }
  ): Promise<TranslationJobEntity | null>;

  /**
   * 활성 intent 조회. 같은 entity·locale에 pending/in_progress job이 있으면
   * 반복 발행 동기화가 중복 job을 만들지 않고 기존 intent를 재사용한다.
   * 조회·생성 사이 경쟁은 기존처럼 유일 결과가 아닌 중복 허용으로 흡수되며,
   * recovery tick이 전송 누락분을 재발견한다.
   */
  findActiveJob?(input: {
    entityType: string;
    entityId: string;
    locale?: string;
  }): Promise<TranslationJobEntity | null>;

  /**
   * 복구 대상 조회. 큐 전송이 누락된 pending과 lease가 만료된
   * in_progress를 반환한다. recovery tick이 주기적으로 재발견한다.
   */
  findRecoverableJobs?(input: { now: Date; limit?: number }): Promise<TranslationJobEntity[]>;

  findJobs(options?: {
    status?: TranslationJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<TranslationJobEntity[]>;
}
