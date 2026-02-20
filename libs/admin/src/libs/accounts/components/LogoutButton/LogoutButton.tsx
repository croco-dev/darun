"use client";

import { bind } from "@croco/utils-structure-react";
import { IconLogout } from "@tabler/icons-react";
import classes from "./LogoutButton.module.css";
import { useLogoutButton } from "./useLogoutButton";

export const LogoutButton = bind(useLogoutButton, ({ logout }) => (
  <button type="button" className={classes.link} onClick={logout}>
    <IconLogout className={classes.linkIcon} stroke={1.5} />
    <span>로그아웃</span>
  </button>
));
