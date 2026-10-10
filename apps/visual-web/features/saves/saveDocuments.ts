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

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query MyVisualSavedScreenshots($first: Int, $page: Int) {
    myVisualSavedScreenshots(first: $first, page: $page) {
      totalCount
      edges {
        cursor
        node {
          id
          imageUrl
          imageAlt
          title
          platform
          screenType
          product {
            id
            name
            slug
            logoUrl
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query MyVisualSavedFlows($first: Int, $page: Int) {
    myVisualSavedFlows(first: $first, page: $page) {
      totalCount
      edges {
        cursor
        node {
          id
          title
          description
          platform
          flowType
          stepCount
          coverScreenshot {
            id
            imageUrl
            imageAlt
          }
          product {
            id
            name
            slug
            logoUrl
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const VISUAL_SAVES_PAGE_SIZE = 24;
