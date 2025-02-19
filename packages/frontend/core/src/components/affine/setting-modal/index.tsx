import { WorkspaceDetailSkeleton } from '@affine/component/setting-components';
import { Modal, type ModalProps } from '@affine/component/ui/modal';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import type { WorkspaceMetadata } from '@affine/workspace/metadata';
import { ContactWithUsIcon } from '@blocksuite/icons';
import { debounce } from 'lodash-es';
import { Suspense, useCallback, useLayoutEffect, useRef } from 'react';

import { useCurrentLoginStatus } from '../../../hooks/affine/use-current-login-status';
import { AccountSetting } from './account-setting';
import {
  GeneralSetting,
  type GeneralSettingKeys,
  useGeneralSettingList,
} from './general-setting';
import { SettingSidebar } from './setting-sidebar';
import * as style from './style.css';
import { WorkspaceSetting } from './workspace-setting';

type ActiveTab = GeneralSettingKeys | 'workspace' | 'account';

export interface SettingProps extends ModalProps {
  activeTab: ActiveTab;
  workspaceMetadata?: WorkspaceMetadata | null;
  onSettingClick: (params: {
    activeTab: ActiveTab;
    workspaceMetadata: WorkspaceMetadata | null;
  }) => void;
}

export const SettingModal = ({
  activeTab = 'appearance',
  workspaceMetadata = null,
  onSettingClick,
  ...modalProps
}: SettingProps) => {
  const t = useAFFiNEI18N();
  const loginStatus = useCurrentLoginStatus();

  const generalSettingList = useGeneralSettingList();

  const modalContentRef = useRef<HTMLDivElement>(null);
  const modalContentWrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!modalProps.open) return;
    let animationFrameId: number;
    const onResize = debounce(() => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        if (!modalContentRef.current || !modalContentWrapperRef.current) return;

        const wrapperWidth = modalContentWrapperRef.current.offsetWidth;
        const contentWidth = modalContentRef.current.offsetWidth;

        modalContentRef.current?.style.setProperty(
          '--setting-modal-width',
          `${wrapperWidth}px`
        );
        modalContentRef.current?.style.setProperty(
          '--setting-modal-gap-x',
          `${(wrapperWidth - contentWidth) / 2}px`
        );
      });
    }, 200);
    window.addEventListener('resize', onResize);
    onResize();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
    };
  }, [modalProps.open]);

  const onGeneralSettingClick = useCallback(
    (key: GeneralSettingKeys) => {
      onSettingClick({
        activeTab: key,
        workspaceMetadata: null,
      });
    },
    [onSettingClick]
  );
  const onWorkspaceSettingClick = useCallback(
    (workspaceMetadata: WorkspaceMetadata) => {
      onSettingClick({
        activeTab: 'workspace',
        workspaceMetadata,
      });
    },
    [onSettingClick]
  );
  const onAccountSettingClick = useCallback(() => {
    onSettingClick({ activeTab: 'account', workspaceMetadata: null });
  }, [onSettingClick]);

  return (
    <Modal
      width={1080}
      height={760}
      contentOptions={{
        ['data-testid' as string]: 'setting-modal',
        style: {
          maxHeight: '85vh',
          maxWidth: '70vw',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
        },
      }}
      {...modalProps}
    >
      <SettingSidebar
        generalSettingList={generalSettingList}
        onGeneralSettingClick={onGeneralSettingClick}
        onWorkspaceSettingClick={onWorkspaceSettingClick}
        selectedGeneralKey={activeTab}
        selectedWorkspaceId={workspaceMetadata?.id ?? null}
        onAccountSettingClick={onAccountSettingClick}
      />

      <div
        data-testid="setting-modal-content"
        className={style.wrapper}
        ref={modalContentWrapperRef}
      >
        <div ref={modalContentRef} className={style.centerContainer}>
          <div className={style.content}>
            <Suspense fallback={<WorkspaceDetailSkeleton />}>
              {activeTab === 'workspace' && workspaceMetadata ? (
                <WorkspaceSetting
                  key={workspaceMetadata.id}
                  workspaceMetadata={workspaceMetadata}
                />
              ) : null}
              {generalSettingList.some(v => v.key === activeTab) ? (
                <GeneralSetting generalKey={activeTab as GeneralSettingKeys} />
              ) : null}
              {activeTab === 'account' && loginStatus === 'authenticated' ? (
                <AccountSetting />
              ) : null}
            </Suspense>
          </div>
          <div className={style.footer}>
            <a
              href="https://community.affine.pro/home"
              target="_blank"
              rel="noreferrer"
              className={style.suggestionLink}
            >
              <span className={style.suggestionLinkIcon}>
                <ContactWithUsIcon width="16" height="16" />
              </span>
              {t['com.affine.settings.suggestion']()}
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
};
