"use client";

import { bind } from "@croco/utils-structure-react";
import { Button } from "@darun/ui";
import { useHeaderLoginButton } from "./useHeaderLoginButton";

export const HeaderLoginButton = bind(
  useHeaderLoginButton,
  ({ isLoading, isLoggedIn, login, logout }) =>
    isLoading ? null : isLoggedIn ? (
      <Button type="button" kind="text" onClick={logout}>
        로그아웃
      </Button>
    ) : (
      <Button type="button" kind="text" onClick={login}>
        로그인
      </Button>
    ),
);
