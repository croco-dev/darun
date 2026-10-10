'use client';

import { gql } from '@apollo/client';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  mutation ToggleVisualScreenshotSave($id: String!) {
    toggleVisualScreenshotSave(id: $id) {
      saved
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  mutation ToggleVisualFlowSave($id: String!) {
    toggleVisualFlowSave(id: $id) {
      saved
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query VisualScreenshotSaveStatus($id: String!) {
    visualScreenshotSaveStatus(id: $id) {
      saved
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query VisualFlowSaveStatus($id: String!) {
    visualFlowSaveStatus(id: $id) {
      saved
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query MyVisualScreenshotSaves($first: Int, $page: Int) {
    myVisualScreenshotSaves(first: $first, page: $page)
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query MyVisualFlowSaves($first: Int, $page: Int) {
    myVisualFlowSaves(first: $first, page: $page)
  }
`;
