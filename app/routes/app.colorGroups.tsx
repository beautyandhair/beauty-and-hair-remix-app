import {
  Page,
  Card, 
  Tabs,
  TabProps,
  TextField,
  Button,
  InlineGrid,
  Box,
  Divider,
  BlockStack,
  IndexTable,
  Text,
  InlineStack,
  DropZone,
  Thumbnail
} from '@shopify/polaris';
import { DeleteIcon } from '@shopify/polaris-icons';
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  SubmitFunction,
  useActionData,
  useLoaderData,
  useSubmit
} from "@remix-run/react";

import {
  VendorColorGroup,
  getVendorColorGroups,
  deleteVendorColorGroup,
  createUpdateVendorColorGroup,
  validateVendorColorGroup,
  stageColorImage,
  uploadColorImage
} from "../models/VendorColorGroups.server";
import { authenticate } from 'app/shopify.server';

export async function loader() {
  return Response.json(await getVendorColorGroups());
}

export async function action({ request }: {request: Request }) {
  const data: any = {
    ...Object.fromEntries(await request.formData())
  };

  if (data.stagingImage && data.file) {
    const { admin } = await authenticate.admin(request);

    return stageColorImage(admin.graphql, JSON.parse(data.file));
  }
  else if (data.uploadingImage && data.resourceUrl) {
    const { admin } = await authenticate.admin(request);

    return uploadColorImage(admin.graphql, data.resourceUrl);
  }

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

  const onDeleteColorGroup = (color: string) => async () => {
    const currentVendorTab = vendorColorGroupData[selected];

    if (currentVendorTab.colors && currentVendorTab.colors[color]) {
      delete currentVendorTab.colors[color];
    }
    else {
      return;
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
            <ColorGroupTable vendorColorGroupData={vendorColorGroupData} selected={selected} onDeleteColorGroup={onDeleteColorGroup} submit={submit} />
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

function ColorGroupTable({vendorColorGroupData, selected, onDeleteColorGroup, submit}: {
  vendorColorGroupData: VendorColorGroup[],
  selected: number,
  onDeleteColorGroup: (color: string) => () => void,
  submit: SubmitFunction
}) {
  const actionData = useActionData<any>();
  const [file, setFile] = useState<File>();

  useEffect(() => {
    if (actionData?.stagedTarget) {
      handleUploadImage(actionData.stagedTarget);
    }
  }, [actionData]);

  const handleUploadImage = async (stagedTarget: any) => {
      if (!file) {
        return;
      }

      const params = stagedTarget.parameters; // Parameters contain all the sensitive info we'll need to interact with the aws bucket.
      const url = stagedTarget.url; // This is the url you'll use to post data to aws. It's a generic s3 url that when combined with the params sends your data to the right place.
      const resourceUrl = stagedTarget.resourceUrl;

      const formData = new FormData();

      params.forEach(({ name, value }: {name: any, value: any}) => {
        formData.append(name, value);
      });

      formData.append("file", file);

      const stagedResponse = await fetch(url, {
        method: "post",
        body: formData
      });

      submit({uploadingImage: true, resourceUrl}, { method: "POST" })
  }

  const handleDropZoneDrop = useCallback(async (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) => {
    const acceptedFile = acceptedFiles[0];
    setFile(acceptedFile);
    submit({stagingImage: true, file: JSON.stringify({ filename: acceptedFile.name, mimeType: acceptedFile.type, fileSize: acceptedFile.size.toString() })}, { method: "POST" });
  }, []);

  const rows = useMemo(() => {
    const selectedVendorGroupColors = vendorColorGroupData[selected]?.colors;
    const selectedVenderColorImages = vendorColorGroupData[selected]?.colorImages;

    if (selectedVendorGroupColors && Object.keys(selectedVendorGroupColors).length) {
      return Object.keys(selectedVendorGroupColors).map((key, index) => (
        <IndexTable.Row
          id={key}
          key={key}
          position={index}
        >
          <td style={{width: 0}} className="Polaris-IndexTable__TableCell">
            <Box width="50px">
              <DropZone onDrop={handleDropZoneDrop} allowMultiple={false} accept="image/png, image/jpeg">
                {selectedVenderColorImages?.[key] ? (
                  <Thumbnail
                    size="small"
                    alt={`${key} Color Image`}
                    source={selectedVenderColorImages[key]}
                  />
                ) : <DropZone.FileUpload />}
              </DropZone>
            </Box>
          </td>

          <IndexTable.Cell>
            <Text variant="bodyMd" fontWeight="bold" as="span">
              {key}
            </Text>
          </IndexTable.Cell>

          <IndexTable.Cell>{selectedVendorGroupColors[key]}</IndexTable.Cell>
          
          <td style={{width: 0}} className="Polaris-IndexTable__TableCell">
            <InlineStack align="center">
              <Button icon={DeleteIcon} accessibilityLabel="Delete Color Group" onClick={onDeleteColorGroup(key)} />
            </InlineStack>
          </td>
        </IndexTable.Row>
      ));
    }
    else {
      return null;
    }
  }, [vendorColorGroupData, selected]);

  return (
    <Card padding="0">
      <IndexTable
        itemCount={rows?.length ?? 0}
        selectable={false}
        headings={[
            {title: 'Image', alignment: 'center'},
            {title: 'Color'},
            {title: 'Group'},
            {title: 'Remove', alignment: 'end'}
          ]}
      >
        {rows}
      </IndexTable>
    </Card>
  );
}