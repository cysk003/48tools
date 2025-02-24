import { randomUUID } from 'node:crypto';
import { Fragment, useState, type ReactElement, type Dispatch as D, type SetStateAction as S, type MouseEvent } from 'react';
import { useDispatch } from 'react-redux';
import type { Dispatch } from '@reduxjs/toolkit';
import { Button, Form, Modal, Input, type FormInstance } from 'antd';
import type { Store } from 'antd/es/form/interface';
import type { Rule } from 'rc-field-form/es/interface';
import type { DataDispatchFunc } from '@indexeddb-tools/indexeddb-redux';
import commonStyle from '../../common.sass';

const descriptionRule: Array<Rule> = [{ required: true, message: '请填写直播间说明', whitespace: true }];
const roomIdRule: Array<Rule> = [
  { required: true, message: '请填写直播间ID', whitespace: true },
  { pattern: /^\d+$/, message: '直播间ID必须是数字' }
];

/* 添加A站 B站 抖音的直播间ID，保存到数据库 */
interface AddLiveRoomFormProps {
  dataTestId?: string;
  modalTitle: string | ReactElement;
  tips?: string;
  IDBSaveDataFunc: DataDispatchFunc;
  customRoomIdRule?: Array<Rule>;
}

function AddLiveRoomForm(props: AddLiveRoomFormProps): ReactElement {
  const { dataTestId, modalTitle, tips, IDBSaveDataFunc, customRoomIdRule }: AddLiveRoomFormProps = props;
  const dispatch: Dispatch = useDispatch();
  const [form]: [FormInstance] = Form.useForm();
  const [visible, setVisible]: [boolean, D<S<boolean>>] = useState(false);

  // 添加一个直播间
  async function handleAddRoomIdClick(event: MouseEvent): Promise<void> {
    let formValue: Store;

    try {
      formValue = await form.validateFields();
    } catch (err) {
      return console.error(err);
    }

    dispatch(IDBSaveDataFunc({
      data: {
        ...formValue,
        id: randomUUID()
      }
    }));
    setVisible(false);
  }

  // 关闭窗口后重置表单
  function handleAddModalClose(): void {
    form.resetFields();
  }

  // 打开弹出层
  function handleOpenAddModalClick(event: MouseEvent): void {
    setVisible(true);
  }

  // 关闭弹出层
  function handleCloseAddModalClick(event: MouseEvent): void {
    setVisible(false);
  }

  return (
    <Fragment>
      <Button type="primary" data-test-id={ dataTestId } onClick={ handleOpenAddModalClick }>添加直播间信息</Button>
      <Modal title={ modalTitle }
        open={ visible }
        width={ 500 }
        afterClose={ handleAddModalClose }
        centered={ true }
        maskClosable={ false }
        onOk={ handleAddRoomIdClick }
        onCancel={ handleCloseAddModalClick }
      >
        <Form className="h-[150px]" form={ form } labelCol={{ span: 5 }} wrapperCol={{ span: 19 }}>
          <Form.Item name="description"
            label="直播间说明"
            rules={ descriptionRule }
          >
            <Input />
          </Form.Item>
          <Form.Item name="roomId"
            label="直播间ID"
            rules={ customRoomIdRule ?? roomIdRule }
          >
            <Input />
          </Form.Item>
          { tips && <p className={ commonStyle.tips }>{ tips }</p> }
        </Form>
      </Modal>
    </Fragment>
  );
}

export default AddLiveRoomForm;