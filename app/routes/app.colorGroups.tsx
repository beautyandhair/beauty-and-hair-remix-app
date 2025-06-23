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
  Vendor,
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  validateVendor
} from "../models/Vendor.server";

import {
  VendorColor,
  VendorColorUpdate,
  createVendorColor,
  updateVendorColor,
  deleteVendorColor,
  stageColorImage,
  uploadColorImage,
  validateVendorColor
} from "../models/VendorColor.server";

import { authenticate } from 'app/shopify.server';

enum Action {
  CreateVendor = "CreateVendor",
  UpdateVendor = "UpdateVendor",
  DeleteVendor = "DeleteVendor",
  CreateVendorColor = "CreateVendorColor",
  UpdateVendorColor = "UpdateVendorColor",
  DeleteVendorColor = "DeleteVendorColor",
  StageColorImage = "StageColorImage",
  UploadColorImage = "UploadColorImage"
}

export async function loader() {
  return Response.json(await getVendors());
}

export async function action({ request }: {request: Request }) {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;

  const data: any = {
    ...Object.fromEntries(await request.formData()),
  };

  switch (data.actionType) {
    case Action.CreateVendor:
      return await createVendor(data.vendorName);
    case Action.UpdateVendor:
      return await updateVendor(data.vendorName, JSON.parse(data.vendorUpdate));
    case Action.DeleteVendor:
      return await deleteVendor(data.vendorName);
    case Action.CreateVendorColor:
      return await createVendorColor(data.vendorName, data.color, data.group);
    case Action.UpdateVendorColor:
      return await updateVendorColor(data.vendorName, data.color, JSON.parse(data.vendorColorUpdate));
    case Action.DeleteVendorColor:
      return await deleteVendorColor(data.vendorName, data.color);
    case Action.StageColorImage:
      return await stageColorImage(admin.graphql, JSON.parse(data.file));
    case Action.UploadColorImage:
      return await uploadColorImage(admin.graphql, data.resourceUrl, data.color);
  }

  return Response.json({ errors: ['Invalid data passed.'] }, { status: 422 });
}

export default function ColorGroups() {
  const submit = useSubmit();

  const [vendors, setVendors] = useState<Vendor[]>(useLoaderData<Vendor[]>() ?? []);
  const [selected, setSelected] = useState(0);

  const vendorTabs = useMemo(() => vendors?.length ? vendors.map((vendor) => vendor.name) : [], [vendors]);
  const currentVendor = useMemo(() => vendors[selected], [vendors, selected]);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  /* MUTATE VENDORS */

  const onCreateVendor = useCallback(async (value: string) => {
    await sleep(500);

    submit({
      actionType: Action.CreateVendor,
      vendorName: value
    }, { method: "POST" });

    setVendors((prev) => [...prev, { name: value, colors: [] }]);

    return true;
  }, []);

  const onUpdateVendor = useCallback(async (value: string) => {
    await sleep(1);

    submit({
      actionType: Action.UpdateVendor,
      vendorName: currentVendor.name,
      vendorUpdate: JSON.stringify({ name: value })
    }, { method: "PUT" });

    currentVendor.name = value;
    setVendors((prev) => [...prev]);

    return true;
  }, [currentVendor]);

  const onDeleteVendor = useCallback(async () => {
    await sleep(1);

    submit({
      actionType: Action.DeleteVendor,
      vendorName: currentVendor.name
    }, { method: "DELETE" });

    setVendors((prev) => prev.filter((vendor) => vendor.name !== currentVendor.name));
    setSelected(0);

    return true;
  }, [currentVendor]);

  /* MUTATE VENDOR COLORS */

  const onAddVendorColor = useCallback(async (color: string, group: string) => {
    const colorData = {
      vendorName: currentVendor.name,
      color,
      group,
      shopImageIds: {}
    };

    if (currentVendor.colors) {
      currentVendor.colors.push({...colorData});
    }
    else {
      currentVendor.colors = [{...colorData}];
    }

    await sleep(1);
    submit({
      actionType: Action.CreateVendorColor,
      vendorName: currentVendor.name,
      color,
      group
    }, { method: "POST" });

    setVendors((prev) => [...prev]);
  }, [currentVendor]);

  const onUpdateVendorColorImage = useCallback(async (color: string, vendorColorUpdate: VendorColorUpdate) => {
    const vendorColor = currentVendor.colors?.find((vendorColor) => vendorColor.color === color);

    if (vendorColor) {
      vendorColor.color = vendorColorUpdate.color ?? vendorColor.color;
      vendorColor.group = vendorColorUpdate.group ?? vendorColor.group;
      vendorColor.imageSrc = vendorColorUpdate.imageSrc ?? vendorColor.imageSrc;
      vendorColor.shopImageIds = vendorColorUpdate.shopImageIds ?? vendorColor.shopImageIds;
    }
    else {
      return;
    }

    await sleep(1);
    submit({
      actionType: Action.UpdateVendorColor,
      vendorName: currentVendor.name,
      color,
      vendorColorUpdate: JSON.stringify(vendorColorUpdate)
    }, { method: "PUT" });

    setVendors((prev) => [...prev]);
  }, [currentVendor]);

  const onDeleteVendorColor = useCallback((color: string) => async () => {
    if (currentVendor.colors && currentVendor.colors) {
      currentVendor.colors = currentVendor.colors.filter((vendorColor) => vendorColor.color != color);
    }
    else {
      return;
    }

    await sleep(1);
    submit({
      actionType: Action.CreateVendorColor,
      vendorName: currentVendor.name,
      color
    }, { method: "DELETE" });

    setVendors((prev) => [...prev]);
  }, [currentVendor]);

  /* OTHER FUNCTIONALITY */

  const tabs: TabProps[] = vendorTabs.map((vendorTab, index) => ({
    content: vendorTab,
    index,
    onAction: () => {},
    id: `${vendorTab}-${index}`,
    actions:
      [
        {
          type: 'rename',
          onAction: () => {},
          onPrimaryAction: onUpdateVendor
        },
        {
          type: 'delete',
          onPrimaryAction: onDeleteVendor,
        },
      ],
  }));

  return (
    <Page title="Color Groups">
      <Card>
        <Tabs
          tabs={tabs}
          selected={selected}
          onSelect={setSelected}
          canCreateNewView
          onCreateNewView={onCreateVendor}
        >
          <BlockStack gap="600">
            <ColorGroupForm onAddVendorColor={onAddVendorColor} />
            <Divider />
            <ColorGroupTable
              vendors={vendors}
              selected={selected}
              onDeleteVendorColor={onDeleteVendorColor}
              onUpdateVendorColorImage={onUpdateVendorColorImage}
              submit={submit}
            />
          </BlockStack>
        </Tabs>
      </Card>
    </Page>
  );
}

function ColorGroupForm({ onAddVendorColor }: { onAddVendorColor: (color: string, group: string) => void }) {
  const [color, setColor] = useState('');
  const [group, setGroup] = useState('');

  const handleAddColorGroup = useCallback(() => {
    onAddVendorColor(color, group);
    
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

function ColorGroupTable({vendors, selected, onDeleteVendorColor, onUpdateVendorColorImage, submit}: {
  vendors: Vendor[],
  selected: number,
  onDeleteVendorColor: (color: string) => () => void,
  onUpdateVendorColorImage: (color: string, vendorColorUpdate: VendorColorUpdate) => Promise<void>,
  submit: SubmitFunction
}) {
  const actionData = useActionData<any>();
  const [colorFile, setColorFile] = useState<{color: string, file: File}>();

  useEffect(() => {
    if (actionData?.stagedTarget) {
      handleUploadImage(actionData.stagedTarget);
    }
    else if (colorFile?.color && actionData?.imageSrc) {
      onUpdateVendorColorImage(colorFile.color, {
        imageSrc: actionData.imageSrc.url
      });
    }
  }, [actionData]);

  const handleUploadImage = async (stagedTarget: any) => {
      if (!colorFile) {
        return;
      }

      const params = stagedTarget.parameters; // Parameters contain all the sensitive info we'll need to interact with the aws bucket.
      const url = stagedTarget.url; // This is the url you'll use to post data to aws. It's a generic s3 url that when combined with the params sends your data to the right place.
      const resourceUrl = stagedTarget.resourceUrl;

      const formData = new FormData();

      params.forEach(({ name, value }: {name: any, value: any}) => {
        formData.append(name, value);
      });

      formData.append("file", colorFile.file);

      await fetch(url, {
        method: "post",
        body: formData
      });

      submit({
        actionType: Action.UploadColorImage,
        resourceUrl,
        color: colorFile.color
      }, { method: "POST" });
  }

  const handleDropZoneDrop = useCallback((color: string) => async (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) => {
    const acceptedFile = acceptedFiles[0];

    setColorFile({color: color, file: acceptedFile});
    submit({
      actionType: Action.StageColorImage,
      file: JSON.stringify({ filename: acceptedFile.name, mimeType: acceptedFile.type, fileSize: acceptedFile.size.toString()})
    }, { method: "POST" });
  }, []);

  const rows = useMemo(() => {
    const selectedVendorColors = vendors[selected]?.colors;

    if (selectedVendorColors && Object.keys(selectedVendorColors).length) {
      return selectedVendorColors.map((vendorColor, index) => {
        return (
          <IndexTable.Row
            id={vendorColor.color}
            key={vendorColor.color}
            position={index}
          >
            <td style={{width: 0}} className="Polaris-IndexTable__TableCell">
              <Box width="60px">
                <DropZone onDrop={handleDropZoneDrop(vendorColor.color)} allowMultiple={false} accept="image/png, image/jpeg">
                  {vendorColor.imageSrc ? (
                    <Thumbnail
                      size="medium"
                      alt={`${vendorColor.color} Color Image`}
                      source={vendorColor.imageSrc}
                    />
                  ) : <DropZone.FileUpload />}
                </DropZone>
              </Box>
            </td>

            <IndexTable.Cell>
              <Text variant="bodyMd" fontWeight="bold" as="span">
                {vendorColor.color}
              </Text>
            </IndexTable.Cell>

            <IndexTable.Cell>{vendorColor.group}</IndexTable.Cell>
            
            <td style={{width: 0}} className="Polaris-IndexTable__TableCell">
              <InlineStack align="center">
                <Button icon={DeleteIcon} accessibilityLabel="Delete Color Group" onClick={onDeleteVendorColor(vendorColor.color)} />
              </InlineStack>
            </td>
          </IndexTable.Row>
      )});
    }
    else {
      return null;
    }
  }, [vendors, selected]);

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