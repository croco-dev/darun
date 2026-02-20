"use client";

import { bind } from "@croco/utils-structure-react";
import { TextButton } from "@darun/ui-foundation";
import { useHeaderLoginButton } from "./useHeaderLoginButton";

export const HeaderLoginButton = bind(
  useHeaderLoginButton,
  ({ isLoading, isLoggedIn, login, logout }) =>
    isLoading ? null : isLoggedIn ? (
      <TextButton type="button" onClick={logout}>
        로그아웃
      </TextButton>
    ) : (
      <TextButton type="button" onClick={login}>
        로그인
      </TextButton>
    ),
);
