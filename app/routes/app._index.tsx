import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function Index() {

  return (
    <Page>
      <TitleBar title="Beauty&Hair Tools">
        Beauty&Hair Tools
      </TitleBar>

      <BlockStack gap="500">
        <Layout>
          <Card>
            :)
          </Card>
        </Layout>
      </BlockStack>
    </Page>
  );
}
