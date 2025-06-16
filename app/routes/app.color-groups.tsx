import { Page, Card, Tabs, TabProps, DataTable, TextField, Button, InlineGrid, Box, Divider, BlockStack } from '@shopify/polaris';
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  useLoaderData,
  useSubmit
} from "@remix-run/react";

import {
  VendorColorGroup,
  getVendorColorGroups,
  deleteVendorColorGroup,
  createUpdateVendorColorGroup,
  validateVendorColorGroup
} from "../models/VendorColorGroups.server";

export async function loader() {
  return Response.json(await getVendorColorGroups());
}

export async function action({ request }: {request: Request }) {
  const data: any = {
    ...Object.fromEntries(await request.formData())
  };

  const errors = validateVendorColorGroup(data as VendorColorGroup);

  if (request.method === "DELETE") {
    await deleteVendorColorGroup((data as VendorColorGroup).vendor);
    return;
  }

  if (errors) {
    return Response.json({ errors }, { status: 422 });
  }

  return await createUpdateVendorColorGroup(request.method, data.vendorId ?? data.vendor, { vendor: data.vendor, colors: JSON.parse(data.colors) });
}

export default function ColorGroups() {
  const submit = useSubmit();

  const [selected, setSelected] = useState(0);
  const [vendorColorGroupData, setVendorColorGroupData] = useState<VendorColorGroup[]>(useLoaderData<VendorColorGroup[]>() ?? []);

  const vendorTabs = useMemo(() => vendorColorGroupData?.length
    ? vendorColorGroupData.map((vendorColorGroup) => vendorColorGroup.vendor)
    : []
  , [vendorColorGroupData]);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const tabs: TabProps[] = vendorTabs.map((tabVendor, index) => ({
    content: tabVendor,
    index,
    onAction: () => {},
    id: `${tabVendor}-${index}`,
    actions:
      [
        {
          type: 'rename',
          onAction: () => {},
          onPrimaryAction: async (value: string) => {
            const currentVendorTab = vendorColorGroupData[selected];

            await sleep(1);
            submit({
              vendorId: currentVendorTab.vendor,
              vendor: value,
              colors: JSON.stringify(currentVendorTab.colors ?? {})
            }, { method: "PUT" });

            currentVendorTab.vendor = value;
            setVendorColorGroupData((prev) => [...prev]);

            return true;
          },
        },
        {
          type: 'delete',
          onPrimaryAction: async () => {
            await sleep(1);

            submit({ vendor: tabVendor }, { method: "DELETE" });

            setVendorColorGroupData((prev) => prev.filter((vendorColorGroup) => vendorColorGroup.vendor !== tabVendor));
            setSelected(0);

            return true;
          },
        },
      ],
  }));

  const onCreateNewView = async (value: string) => {
    await sleep(500);

    submit({ vendor: value, colors: '{}' }, { method: "POST" });
    setVendorColorGroupData((prev) => [...prev, { vendor: value, colors: {} }]);

    return true;
  };

  const onAddColorGroup = async (color: string, group: string) => {
    const currentVendorTab = vendorColorGroupData[selected];

    if (currentVendorTab.colors) {
      currentVendorTab.colors = {...currentVendorTab.colors, [color]: group};
    }
    else {
      currentVendorTab.colors = {[color]: group};
    }

    await sleep(1);
    submit({ vendor: currentVendorTab.vendor, colors: JSON.stringify(currentVendorTab.colors) }, { method: "PUT" });

    setVendorColorGroupData((prev) => [...prev]);
  };

  return (
    <Page title="Color Groups">
      <Card>
        <Tabs
          tabs={tabs}
          selected={selected}
          onSelect={setSelected}
          canCreateNewView
          onCreateNewView={onCreateNewView}
        >
          <BlockStack gap="600">
            <ColorGroupForm onAddColorGroup={onAddColorGroup} />
            <Divider />
            <ColorGroupTable vendorColorGroupData={vendorColorGroupData} selected={selected} />
          </BlockStack>
        </Tabs>
      </Card>
    </Page>
  );
}

function ColorGroupForm({ onAddColorGroup }: { onAddColorGroup: (color: string, group: string) => void }) {
  const [color, setColor] = useState('');
  const [group, setGroup] = useState('');

  const handleAddColorGroup = useCallback(() => {
    onAddColorGroup(color, group);
    setColor('');
    setGroup('');
  }, [color, group]);

  const handleColorChange = useCallback((value: string) => setColor(value), []);

  const handleGroupChange = useCallback((value: string) => setGroup(value), []);

  return (
    <InlineGrid gap="400" columns={2}>
      <TextField
        value={color}
        onChange={handleColorChange}
        label="Color"
        type="text"
        autoComplete="off"
      />

      <TextField
        value={group}
        onChange={handleGroupChange}
        label="Color Group"
        type="text"
        autoComplete="off"
      />
      <Box>
        <Button onClick={handleAddColorGroup} size="slim">Add Color Group</Button>
      </Box>
    </InlineGrid>
  );
}

function ColorGroupTable({vendorColorGroupData, selected}: {vendorColorGroupData: VendorColorGroup[], selected: number}) {
  const rows = useMemo(() => {
    const selectedVendorGroupColors = vendorColorGroupData[selected]?.colors;

    if (selectedVendorGroupColors && Object.keys(selectedVendorGroupColors).length) {
      return Object.keys(selectedVendorGroupColors).map((key) => [key, selectedVendorGroupColors[key]]);
    }
    else {
      return [];
    }
  }, [vendorColorGroupData, selected]);

  return (
    <DataTable
      columnContentTypes={[
        'text',
        'text',
      ]}
      headings={[
        'Color',
        'Color Group',
      ]}
      rows={rows}
      footerContent={`Showing ${rows.length} of ${rows.length} results`}
    />
  );
}