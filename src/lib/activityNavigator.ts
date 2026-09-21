export interface ActivityTarget {
  path: string;
  label: string;
  badge?: string;
  specificName?: string;
}

/**
 * Intelligent resolver that parses activity details, action types, and modules
 * to determine the exact specific detail view, filtered page, or entity route.
 * Prioritizes direct ID routing (e.g. /tasks/Task-1103, /projects/PRJ-1002, /issues/issue1001).
 */
export function resolveActivityTarget(act: {
  action_type?: string;
  module?: string;
  details?: string;
}): ActivityTarget {
  const mod = (act.module || '').toLowerCase();
  const action = (act.action_type || '').toLowerCase();
  const rawDesc = (act.details || '').trim();
  const desc = rawDesc.toLowerCase();

  // Helper to extract quoted string e.g. "My Task Name" or 'My Task Name'
  const extractQuoted = (text: string): string | null => {
    const match = text.match(/["“']([^"”']+)["”']/);
    return match && match[1] ? match[1].trim() : null;
  };

  // 1. Direct ID extraction from text (Priority 1: Direct Specific Detail Pages)

  // 1a. Task ID pattern: Task-1103, TASK-1103, task-1103, TSK-1103, T1001, etc.
  const taskIdMatch = rawDesc.match(/\b(Task-\d+|TASK-\d+|task-\d+|TSK-\d+|tsk-\d+|T\d{4,5})\b/i) ||
                      rawDesc.match(/\[(?:id:\s*)?(Task-\d+|TASK-\d+|task-\d+|TSK-\d+|tsk-\d+|T\d{4,5})\]/i);
  if (taskIdMatch) {
    const taskId = taskIdMatch[1];
    return {
      path: `/tasks/${taskId}`,
      label: `Task ${taskId}`,
      badge: 'Task',
      specificName: taskId,
    };
  }

  // 1b. Project ID pattern: PRJ-1002, PROJ-1002, P1002, etc.
  const projIdMatch = rawDesc.match(/\b(PRJ-\d+|PROJ-\d+|prj-\d+|proj-\d+|P\d{4,5})\b/i) ||
                      rawDesc.match(/\[(?:id:\s*)?(PRJ-\d+|PROJ-\d+|prj-\d+|proj-\d+|P\d{4,5})\]/i);
  if (projIdMatch && !mod.includes('unit') && !desc.includes('lgh daily report')) {
    const projId = projIdMatch[1];
    return {
      path: `/projects/${projId}`,
      label: `Project ${projId}`,
      badge: 'Project',
      specificName: projId,
    };
  }

  // 1c. Issue ID pattern: ISS-1001, ISU-1001, issue1234, issue-1234, etc.
  const issueIdMatch = rawDesc.match(/\b(ISS-\d+|ISU-\d+|ISSUE-\d+|iss-\d+|isu-\d+|issue\d{3,5}|issue-\d{3,5})\b/i) ||
                       rawDesc.match(/\[(?:id:\s*)?(ISS-\d+|ISU-\d+|ISSUE-\d+|iss-\d+|isu-\d+|issue\d{3,5}|issue-\d{3,5})\]/i);
  if (issueIdMatch) {
    const issueId = issueIdMatch[1];
    return {
      path: `/issues/${issueId}`,
      label: `Issue ${issueId}`,
      badge: 'Issue',
      specificName: issueId,
    };
  }

  // 1d. Order ID pattern: OB1001, ORD1001, ORD-1001, ORDER-1001, etc.
  const orderIdMatch = rawDesc.match(/\b(OB\d{3,5}|ORD\d{3,5}|ORD-\d{3,5}|ORDER-\d{3,5}|ob\d{3,5})\b/i) ||
                       rawDesc.match(/\[(?:id:\s*)?(OB\d{3,5}|ORD\d{3,5}|ORD-\d{3,5}|ORDER-\d{3,5}|ob\d{3,5})\]/i) ||
                       rawDesc.match(/id:\s*([a-zA-Z0-9_-]+)/i);
  if (orderIdMatch && (mod.includes('order') || desc.includes('order') || desc.includes('pesanan') || action.includes('order'))) {
    const orderId = orderIdMatch[1];
    return {
      path: `/orders/${orderId}`,
      label: `Order ${orderId}`,
      badge: 'Order',
      specificName: orderId,
    };
  }

  // 1e. Activity / Subtask ID pattern: ACT-1001, ST-1001, SUB-1001
  const subtaskIdMatch = rawDesc.match(/\b(ACT-\d+|ST-\d+|SUB-\d+)\b/i) ||
                         rawDesc.match(/\[(?:id:\s*)?(ACT-\d+|ST-\d+|SUB-\d+)\]/i);
  if (subtaskIdMatch && (mod.includes('subtask') || desc.includes('subtask') || action.includes('subtask'))) {
    const stId = subtaskIdMatch[1];
    return {
      path: `/activities/${stId}`,
      label: `Subtask ${stId}`,
      badge: 'Subtask',
      specificName: stId,
    };
  }

  // 2. Specific Unit matching (UNT01 to UNT99)
  const untMatch = rawDesc.match(/UNT\d+/i) || mod.match(/UNT\d+/i);
  if (untMatch) {
    const unitCode = untMatch[0].toUpperCase();
    let unitLabel = `Unit ${unitCode}`;
    let badge = 'Unit';
    if (unitCode === 'UNT01') {
      unitLabel = 'Head Quarter (UNT01)';
      badge = 'HQ';
    } else if (unitCode === 'UNT03') {
      unitLabel = 'Lion Parcel (UNT03)';
      badge = 'Lion Parcel';
    } else if (unitCode === 'UNT04') {
      unitLabel = 'Chillhub Surabaya (UNT04)';
      badge = 'Chillhub';
    } else if (unitCode === 'UNT19') {
      unitLabel = 'Lovissa Guest House (UNT19)';
      badge = 'LGH';
    }
    return {
      path: `/units/${unitCode}`,
      label: unitLabel,
      badge,
      specificName: unitCode,
    };
  }

  // 3. LGH / Lovissa Guest House (Daily Report & Check-In)
  if (
    mod.includes('lgh') ||
    mod.includes('lovissa') ||
    desc.includes('lgh daily report') ||
    desc.includes('lovissa guest house') ||
    desc.includes('check in lovissa') ||
    desc.includes('lgh-')
  ) {
    return {
      path: '/units/UNT19',
      label: 'Lovissa Guest House (UNT19)',
      badge: 'LGH Report',
      specificName: 'LGH Daily Report',
    };
  }

  // 4. Lion Parcel / Kirim Barang
  if (
    mod.includes('kirim barang') ||
    desc.includes('lion parcel') ||
    desc.includes('kirim barang via lion parcel')
  ) {
    return {
      path: '/units/UNT03',
      label: 'Lion Parcel (UNT03)',
      badge: 'Lion Parcel',
      specificName: 'Lion Parcel',
    };
  }

  // 5. Chillhub Surabaya (CHS) Daily Report
  if (
    mod.includes('daily report form') ||
    desc.includes('chs daily sales') ||
    desc.includes('chillhub')
  ) {
    return {
      path: '/units/UNT04',
      label: 'Chillhub Surabaya (UNT04)',
      badge: 'Chillhub',
      specificName: 'Chillhub Surabaya',
    };
  }

  // 6. Head Quarter (HQ)
  if (
    mod.includes('hq form') ||
    desc.includes('melapor hq') ||
    desc.includes('head quarter')
  ) {
    return {
      path: '/units/UNT01',
      label: 'Head Quarter (UNT01)',
      badge: 'HQ',
      specificName: 'Head Quarter',
    };
  }

  // 7. Boganatha / Order Product
  if (
    mod.includes('boganatha') ||
    action.includes('order product') ||
    desc.includes('boganatha') ||
    desc.includes('memesan produk')
  ) {
    const bgOrderIdMatch = rawDesc.match(/id:\s*([a-zA-Z0-9_-]+)/i);
    const productName = extractQuoted(rawDesc);
    const query = bgOrderIdMatch ? bgOrderIdMatch[1] : productName || '';

    if (query) {
      return {
        path: `/boganatha-transactions?q=${encodeURIComponent(query)}`,
        label: `Pesanan Boganatha "${query}"`,
        badge: 'Boganatha',
        specificName: query,
      };
    }
    return {
      path: '/boganatha-transactions',
      label: 'Boganatha Transactions',
      badge: 'Boganatha',
      specificName: 'Boganatha',
    };
  }

  // 8. Issue / Issues (Fallback to search if no ID was found)
  if (mod.includes('issue') || desc.includes('issue') || action.includes('issue')) {
    const updateMatch = rawDesc.match(/mengupdate issue\s+["“']?(.+?)["”']?(?:\s*\[|\s*\|\s*|$)/i);
    const submitMatch = rawDesc.match(/mensubmit issue:\s*(.+?)(?:\.\.\.|\s*\[|\s+pada unit|$)/i);
    const issueText = updateMatch ? updateMatch[1].trim() : submitMatch ? submitMatch[1].trim() : '';

    if (issueText) {
      return {
        path: `/issues?q=${encodeURIComponent(issueText)}`,
        label: `Issue: ${issueText.length > 25 ? issueText.substring(0, 25) + '...' : issueText}`,
        badge: 'Issue',
        specificName: issueText,
      };
    }

    return {
      path: '/issues',
      label: 'Daftar Issue',
      badge: 'Issue',
    };
  }

  // 9. Project / Projects (Fallback to search if no ID was found)
  if (mod.includes('project') || action.includes('project') || desc.includes('project')) {
    const createProjMatch = rawDesc.match(/membuat Project baru\s+["“']?(.+?)["”']?(?:\s*\[|\s+untuk unit|$)/i);
    const updateProjMatch = rawDesc.match(/mengubah status Project\s+["“']?(.+?)["”']?(?:\s*\[|\s+untuk unit|$)/i);
    const onProjMatch = rawDesc.match(/pada project\s+["“']([^"”']+)["”']/i);

    const projectName =
      createProjMatch ? createProjMatch[1].trim() :
      updateProjMatch ? updateProjMatch[1].trim() :
      onProjMatch ? onProjMatch[1].trim() :
      extractQuoted(rawDesc) || '';

    if (projectName) {
      return {
        path: `/projects?q=${encodeURIComponent(projectName)}`,
        label: `Project: ${projectName.length > 25 ? projectName.substring(0, 25) + '...' : projectName}`,
        badge: 'Project',
        specificName: projectName,
      };
    }

    return {
      path: '/projects',
      label: 'Daftar Project',
      badge: 'Project',
    };
  }

  // 10. Task / SubTask (Fallback to search if no ID was found)
  if (
    mod.includes('task') ||
    action.includes('task') ||
    mod.includes('subtask') ||
    action.includes('subtask') ||
    desc.includes('subtask') ||
    desc.includes('task')
  ) {
    const subtaskOnTaskMatch = rawDesc.match(/mendapat subtask\s+["“']([^"”']+)["”']\s+pada task\s+["“']([^"”']+)["”']/i);
    const completeSubtaskMatch = rawDesc.match(/menyelesaikan subTask\s+(.+?)\s+pada task\s+["“']([^"”']+)["”']/i);
    const reportTaskMatch = rawDesc.match(/mengirim laporan task\s+["“']?(.+?)["”']?(?:\s*\[|\s+pada project)/i);
    const approveTaskMatch = rawDesc.match(/menyetujui \(Done\) Task\s+["“']?(.+?)["”']?(?:\s*\[|\s+pada project)/i);
    const newTaskMatch = rawDesc.match(/mendapat task baru\s+["“']([^"”']+)["”']/i);

    const taskQuery =
      subtaskOnTaskMatch ? subtaskOnTaskMatch[2] :
      completeSubtaskMatch ? completeSubtaskMatch[2] :
      reportTaskMatch ? reportTaskMatch[1].trim() :
      approveTaskMatch ? approveTaskMatch[1].trim() :
      newTaskMatch ? newTaskMatch[1].trim() :
      extractQuoted(rawDesc) || '';

    if (taskQuery) {
      return {
        path: `/all-tasks?q=${encodeURIComponent(taskQuery)}`,
        label: `Task: ${taskQuery.length > 25 ? taskQuery.substring(0, 25) + '...' : taskQuery}`,
        badge: 'Task',
        specificName: taskQuery,
      };
    }

    return {
      path: '/all-tasks',
      label: 'Daftar Tasks',
      badge: 'Task',
    };
  }

  // 11. Order Budget / Order Detail (Fallback to search if no ID was found)
  if (
    mod.includes('order') ||
    action.includes('order') ||
    desc.includes('order budget') ||
    desc.includes('order')
  ) {
    const orderDescMatch = rawDesc.match(/order\s+(.+?)\s+(?:\[|\(Rp|\d+|untuk)/i);
    const orderDetailName = orderDescMatch ? orderDescMatch[1].trim() : extractQuoted(rawDesc) || '';

    if (orderDetailName) {
      return {
        path: `/orders?q=${encodeURIComponent(orderDetailName)}`,
        label: `Order: ${orderDetailName.length > 25 ? orderDetailName.substring(0, 25) + '...' : orderDetailName}`,
        badge: 'Order Budget',
        specificName: orderDetailName,
      };
    }

    return {
      path: '/orders',
      label: 'Daftar Orders',
      badge: 'Order',
    };
  }

  // 12. Daftar Belanja
  if (desc.includes('daftar belanja') || desc.includes('belanja')) {
    return {
      path: '/daftar-belanja',
      label: 'Daftar Belanja',
      badge: 'Belanja',
    };
  }

  // 13. Contact / Add Contact
  if (mod.includes('contact') || action.includes('contact') || desc.includes('contact')) {
    const contactMatch = rawDesc.match(/bernama\s+["“']([^"”']+)["”']/i);
    const contactName = contactMatch ? contactMatch[1].trim() : extractQuoted(rawDesc) || '';

    if (contactName) {
      return {
        path: `/contacts?q=${encodeURIComponent(contactName)}`,
        label: `Kontak: ${contactName}`,
        badge: 'Kontak',
        specificName: contactName,
      };
    }

    return {
      path: '/contacts',
      label: 'Contacts',
      badge: 'Contact',
    };
  }

  // 14. User
  if (mod.includes('user') || action.includes('user')) {
    return {
      path: '/users',
      label: 'Users List',
      badge: 'User',
    };
  }

  // Default fallback
  return {
    path: '/activities',
    label: 'Activities',
    badge: 'Aktivitas',
  };
}
