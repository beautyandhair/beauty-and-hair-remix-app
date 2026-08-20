import "@shopify/ui-extensions/preact";
import {render} from 'preact';
import { useCallback, useEffect, useState } from "preact/hooks";
import { getTags, addTags, removeTags } from "./utils";

export default async () => {
  render(<Extension />, document.body);
}

function Extension() {
  const { i18n, data } = shopify;
  const [disabled, setDisabled] = useState(true);
  const [daysDifference, setDaysDifference] = useState(-1);

  const customerId = data.selected[0].id;

  const onClick = useCallback(async () => {
    const tagsResponse = await addTags(customerId);
    
    if (tagsResponse.data.tagsAdd.node.id) {
      setDisabled(true);
    }
  }, [customerId]);

  const checkTags = useCallback(async () => {
    const customerResponse = await getTags(customerId);
    const consultationTag = customerResponse.data.customer.tags.find((tag) => tag.startsWith('Consultation'));
    
    if (!consultationTag) {
      setDisabled(false);
      return;
    }

    const consultationDate = new Date(consultationTag.replace('Consultation: ', ''));
    const currentDate = new Date();

    const calcDaysDifference = Math.round((currentDate.getTime() - consultationDate.getTime()) / (24 * 60 * 60 * 1000));

    setDaysDifference(calcDaysDifference);

    if (calcDaysDifference > 365) {
      const tagsResponse = await removeTags(customerId, consultationTag);

      if (tagsResponse.data.tagsRemove.node.id) {
        setDisabled(false);
      }
    }
  }, [customerId]);

  useEffect(() => {
    checkTags();
  }, [customerId]);

  return (
    <s-admin-block heading={i18n.translate("loyalty_actions")}>
      <s-grid gridTemplateColumns="auto 1fr" gap="base" alignItems="center">
        <s-grid-item>
          <s-button disabled={disabled} icon="confetti" onClick={onClick} variant="primary">{i18n.translate("reward_consultation")}</s-button>
        </s-grid-item>
        {disabled && daysDifference > -1 && (
          <s-grid-item>
            <s-text tone="info" color="base">{i18n.translate("already_redeemed", {days: 365 - daysDifference})}</s-text>
          </s-grid-item>
        )}
      </s-grid>
    </s-admin-block>
  );
}
