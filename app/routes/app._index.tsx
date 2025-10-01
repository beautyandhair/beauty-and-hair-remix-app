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
            A work in progress. For any questions or feature requests, ask either John or Kat! :)
          </Card>
        </Layout>
      </BlockStack>
    </Page>
  );
}
