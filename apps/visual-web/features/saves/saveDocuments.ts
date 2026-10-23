'use client';

import { gql } from '@apollo/client';

gql`
  mutation ToggleVisualScreenshotSave($id: String!) {
    toggleVisualScreenshotSave(id: $id) {
      saved
    }
  }
`;

gql`
  mutation ToggleVisualFlowSave($id: String!) {
    toggleVisualFlowSave(id: $id) {
      saved
    }
  }
`;

gql`
  query VisualScreenshotSaveStatus($id: String!) {
    visualScreenshotSaveStatus(id: $id) {
      saved
    }
  }
`;

gql`
  query VisualFlowSaveStatus($id: String!) {
    visualFlowSaveStatus(id: $id) {
      saved
    }
  }
`;

gql`
  query MyVisualScreenshotSaves($first: Int, $page: Int) {
    myVisualScreenshotSaves(first: $first, page: $page)
  }
`;

gql`
  query MyVisualFlowSaves($first: Int, $page: Int) {
    myVisualFlowSaves(first: $first, page: $page)
  }
`;

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
            summary
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
