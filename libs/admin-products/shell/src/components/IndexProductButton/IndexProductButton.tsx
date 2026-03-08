"use client";

import { bind } from "@croco/utils-structure-react";
import { Button } from "@darun/ui";
import { useIndexProductButton } from "./useIndexProductButton";

export const IndexProductButton = bind(
  useIndexProductButton,
  ({ indexProduct }) => (
    <Button
      onClick={indexProduct}
      variant="contained"
      color="secondary"
      size="sm"
    >
      검색 인덱싱
    </Button>
  ),
);
